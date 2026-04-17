import { z } from "zod"
import {
  configFontsSchema,
  configScreenshotsSchema,
  repositorySchema,
} from "~/server/web/shared/schema"

export const editableConfigDiffSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    content: z.string().trim().max(50_000).nullable().optional(),
    repositoryUrl: repositorySchema.nullable().optional(),
    license: z.string().trim().max(120).nullable().optional(),
    themeIds: z.array(z.string()).min(1).max(20).optional(),
    themeNames: z.array(z.string().trim().min(1)).min(1).max(20).optional(),
    platformIds: z.array(z.string()).min(1).max(20).optional(),
    platformNames: z.array(z.string().trim().min(1)).min(1).max(20).optional(),
    fonts: configFontsSchema.optional(),
    screenshots: configScreenshotsSchema.optional(),
  })
  .refine(diff => Object.keys(diff).length > 0, {
    message: "Please change at least one field before submitting.",
  })
