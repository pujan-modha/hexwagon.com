"use server"

import { z } from "zod"
import { MAX_IMAGE_UPLOAD_BYTES } from "~/lib/media-constants"
import { isAllowedImageMimeType, uploadFavicon, uploadImageFile } from "~/lib/media"
import { userProcedure } from "~/lib/safe-actions"

const pathSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9/_-]+$/i)
  .refine(
    value => /^(themes|platforms|ports|configs|ads|users|reports)\//i.test(value),
    "Invalid storage path",
  )

const mediaSchema = z.object({
  url: z.string().min(1).url(),
  path: pathSchema,
})

export const generateFavicon = userProcedure
  .createServerAction()
  .input(mediaSchema)
  .handler(async ({ input: { url, path } }) => uploadFavicon(url, path))

const uploadImageSchema = z.object({
  path: pathSchema,
  file: z
    .instanceof(File)
    .refine(file => file.size > 0, "File cannot be empty")
    .refine(file => file.size <= MAX_IMAGE_UPLOAD_BYTES, "Image must be 8MB or smaller")
    .refine(
      file => isAllowedImageMimeType(file.type),
      "Unsupported image format. Please use PNG, JPG, WebP, GIF, AVIF, or SVG.",
    ),
})

export const uploadImageToS3 = userProcedure
  .createServerAction()
  .input(uploadImageSchema)
  .handler(async ({ input: { file, path } }) =>
    uploadImageFile({
      file,
      s3Path: path,
    }),
  )
