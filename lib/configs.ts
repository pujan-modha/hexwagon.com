import { configFontsSchema, configScreenshotsSchema } from "~/server/web/shared/schema"

export type ConfigFont = {
  name: string
  url: string
}

export const parseConfigFonts = (value: unknown): ConfigFont[] => {
  const parsed = configFontsSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}

export const parseConfigScreenshots = (value: unknown): string[] => {
  const parsed = configScreenshotsSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}
