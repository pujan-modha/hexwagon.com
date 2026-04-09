import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { stripURLSubpath } from "@primoui/utils"
import { env, isProd } from "~/env"
import { s3Client } from "~/services/s3"
import { tryCatch } from "~/utils/helpers"

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
] as const

export const IMAGE_ACCEPT = `${ALLOWED_IMAGE_MIME_TYPES.join(",")},.svg`
export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
}

const IMAGE_FILE_EXTENSIONS = new Set([...Object.values(IMAGE_EXTENSION_BY_MIME), "jpeg"])

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"])
const MAX_IMAGE_FETCH_REDIRECTS = 3
const IMAGE_FETCH_TIMEOUT_MS = 10_000

const getS3PublicBaseUrl = () =>
  (env.S3_PUBLIC_URL ?? `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com`).replace(
    /\/$/,
    "",
  )

const getFileExtension = (fileName: string) => {
  const extension = fileName.split(".").pop()?.trim().toLowerCase()
  return extension && extension.length <= 8 ? extension : null
}

const normalizeContentType = (contentType: string | null) =>
  (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? ""

const isBlockedIpv4Address = (value: string) => {
  const parts = value.split(".").map(Number)

  if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) {
    return false
  }

  const [a, b] = parts

  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 198 && (b === 18 || b === 19)) return true

  return false
}

const isBlockedIpv6Address = (value: string) => {
  const normalized = value.toLowerCase()

  if (normalized === "::" || normalized === "::1") {
    return true
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true
  }

  if (/^fe[89ab]/i.test(normalized)) {
    return true
  }

  const mappedIpv4Prefix = "::ffff:"
  if (normalized.startsWith(mappedIpv4Prefix)) {
    const mappedIpv4 = normalized.slice(mappedIpv4Prefix.length)
    return isBlockedIpv4Address(mappedIpv4)
  }

  return false
}

const isBlockedIpAddress = (value: string) => {
  const ipVersion = isIP(value)

  if (ipVersion === 4) {
    return isBlockedIpv4Address(value)
  }

  if (ipVersion === 6) {
    return isBlockedIpv6Address(value)
  }

  return false
}

const assertPublicImageUrl = async (rawUrl: string) => {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    throw new Error("Invalid image URL.")
  }

  if (!parsedUrl.protocol || !["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP(S) image URLs are allowed.")
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("Image URLs with credentials are not allowed.")
  }

  const hostname = parsedUrl.hostname.trim().toLowerCase()

  if (!hostname) {
    throw new Error("Image URL hostname is required.")
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Local network image URLs are not allowed.")
  }

  if (isBlockedIpAddress(hostname)) {
    throw new Error("Private network image URLs are not allowed.")
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })

  if (!addresses.length) {
    throw new Error("Could not resolve image URL hostname.")
  }

  for (const { address } of addresses) {
    if (isBlockedIpAddress(address)) {
      throw new Error("Private network image URLs are not allowed.")
    }
  }
}

const fetchImageWithSafetyChecks = async (imageUrl: string) => {
  let currentUrl = imageUrl

  for (let redirects = 0; redirects <= MAX_IMAGE_FETCH_REDIRECTS; redirects += 1) {
    await assertPublicImageUrl(currentUrl)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)

    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout)
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")

      if (!location) {
        throw new Error("Image URL redirect is missing location header.")
      }

      if (redirects === MAX_IMAGE_FETCH_REDIRECTS) {
        throw new Error("Too many redirects while fetching image URL.")
      }

      currentUrl = new URL(location, currentUrl).toString()
      continue
    }

    return response
  }

  throw new Error("Failed to fetch image URL.")
}

export const isAllowedImageMimeType = (mimeType: string) => {
  const normalized = normalizeContentType(mimeType)
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(normalized)
}

export const isStoredOnS3 = (url: string) => {
  const trimmed = url.trim()
  if (!trimmed) return false

  return trimmed.startsWith(getS3PublicBaseUrl())
}

const assertValidImageMimeType = (mimeType: string) => {
  if (!isAllowedImageMimeType(mimeType)) {
    throw new Error("Unsupported image format. Please use PNG, JPG, WebP, GIF, AVIF, or SVG.")
  }
}

const assertImageSizeLimit = (sizeInBytes: number) => {
  if (sizeInBytes > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image is too large. Maximum size is 8MB.")
  }
}

const buildImageKey = ({
  s3Path,
  mimeType,
  originalFileName,
}: {
  s3Path: string
  mimeType: string
  originalFileName?: string
}) => {
  const normalizedPath = s3Path.replace(/^\/+|\/+$/g, "")
  const mimeExtension = IMAGE_EXTENSION_BY_MIME[normalizeContentType(mimeType)]
  const fileExtension = originalFileName ? getFileExtension(originalFileName) : null
  const extension = mimeExtension ?? fileExtension ?? "png"
  const keyLastSegment = normalizedPath.split("/").pop() ?? ""
  const keyExtension = getFileExtension(keyLastSegment)
  const hasImageExtension = Boolean(keyExtension && IMAGE_FILE_EXTENSIONS.has(keyExtension))

  return hasImageExtension ? normalizedPath : `${normalizedPath}.${extension}`
}

/**
 * Uploads a file to S3 and returns the S3 location.
 * @param file - The file to upload.
 * @param key - The S3 key to upload the file to.
 * @returns The S3 location of the uploaded file.
 */
export const uploadToS3Storage = async (file: Buffer, key: string, contentType?: string) => {
  const endpoint = getS3PublicBaseUrl()

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      StorageClass: "STANDARD",
    },
    queueSize: 4,
    partSize: 1024 * 1024 * 5,
    leavePartsOnError: false,
  })

  const result = await upload.done()

  if (!result.Key) {
    throw new Error("Failed to upload")
  }

  return `${endpoint}/${key}?v=${Date.now()}`
}

/**
 * Removes a list of directories from S3.
 * @param directories - The directories to remove.
 */
export const removeS3Directories = async (directories: string[]) => {
  for (const directory of directories) {
    await removeS3Directory(directory)
  }
}

/**
 * Removes a directory from S3.
 * @param directory - The directory to remove.
 */
export const removeS3Directory = async (directory: string) => {
  // Safety flag to prevent accidental deletion of S3 files
  if (!isProd) return

  const listCommand = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET,
    Prefix: `${directory}/`,
  })

  let continuationToken: string | undefined

  do {
    const listResponse = await s3Client.send(listCommand)
    for (const object of listResponse.Contents || []) {
      if (object.Key) {
        await removeS3File(object.Key)
      }
    }
    continuationToken = listResponse.NextContinuationToken
    listCommand.input.ContinuationToken = continuationToken
  } while (continuationToken)
}

/**
 * Removes a file from S3.
 * @param key - The S3 key of the file to remove.
 */
export const removeS3File = async (key: string) => {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  })

  return await s3Client.send(deleteCommand)
}

/**
 * Types for media upload
 */
type MediaUploadParams = {
  endpointUrl: string
  s3Key: string
  options?: Record<string, string>
}

/**
 * Uploads media to S3 and returns the S3 location.
 * @param params - The parameters for uploading media.
 * @returns The S3 location of the uploaded media.
 */
export const uploadMedia = async ({ endpointUrl, s3Key, options = {} }: MediaUploadParams) => {
  const url = new URL(endpointUrl)
  for (const [key, value] of Object.entries(options)) {
    url.searchParams.set(key, value)
  }

  const response = await tryCatch(fetch(url.toString()))

  if (response.error) {
    console.error("Error fetching media:", response.error)
    throw response.error
  }

  if (!response.data.ok) {
    throw new Error(`Failed to fetch media: ${response.data.status} ${response.data.statusText}`)
  }

  const contentType = normalizeContentType(response.data.headers.get("content-type"))
  const buffer = Buffer.from(await response.data.arrayBuffer())

  // Upload to S3
  const { data, error } = await tryCatch(
    uploadToS3Storage(buffer, s3Key, isAllowedImageMimeType(contentType) ? contentType : undefined),
  )

  if (error) {
    console.error("Error uploading media:", error)
    throw error
  }

  return data
}

/**
 * Uploads a favicon to S3 and returns the S3 location.
 * @param url - The URL of the website to fetch the favicon from.
 * @param s3Key - The S3 key to upload the favicon to.
 * @returns The S3 location of the uploaded favicon.
 */
export const uploadFavicon = async (url: string, s3Key: string) => {
  const options = {
    domain_url: stripURLSubpath(url),
    sz: "128",
  }

  return uploadMedia({
    endpointUrl: "https://www.google.com/s2/favicons",
    s3Key: `${s3Key}/favicon.png`,
    options,
  })
}

export const uploadImageFromUrl = async ({
  imageUrl,
  s3Path,
}: {
  imageUrl: string
  s3Path: string
}) => {
  const response = await fetchImageWithSafetyChecks(imageUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch image URL: ${response.status} ${response.statusText}`)
  }

  const contentType = normalizeContentType(response.headers.get("content-type"))
  assertValidImageMimeType(contentType)

  const contentLengthHeader = response.headers.get("content-length")
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null
  if (contentLength && Number.isFinite(contentLength)) {
    assertImageSizeLimit(contentLength)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  assertImageSizeLimit(buffer.byteLength)

  const key = buildImageKey({ s3Path, mimeType: contentType })
  return uploadToS3Storage(buffer, key, contentType)
}

export const uploadImageFile = async ({
  file,
  s3Path,
}: {
  file: File
  s3Path: string
}) => {
  const contentType = normalizeContentType(file.type)
  assertValidImageMimeType(contentType)
  assertImageSizeLimit(file.size)

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = buildImageKey({
    s3Path,
    mimeType: contentType,
    originalFileName: file.name,
  })

  return uploadToS3Storage(buffer, key, contentType)
}

export const normalizeImageUrlToS3 = async ({
  imageUrl,
  s3Path,
}: {
  imageUrl: string
  s3Path: string
}) => {
  const trimmed = imageUrl.trim()
  if (!trimmed) return null

  if (isStoredOnS3(trimmed)) {
    return trimmed
  }

  return uploadImageFromUrl({ imageUrl: trimmed, s3Path })
}
