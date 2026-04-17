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
