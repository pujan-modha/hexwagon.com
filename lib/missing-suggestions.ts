import type { MissingSuggestionType } from "@prisma/client"

export const normalizeMissingSuggestionText = (value: string | undefined | null) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase()

export const buildMissingSuggestionLabel = ({
  type,
  label,
  themeName,
  platformName,
  configName,
}: {
  type: MissingSuggestionType
  label: string
  themeName?: string
  platformName?: string
  configName?: string
}) => {
  if (type === "Port" && themeName && platformName) return `${themeName} for ${platformName}`
  if (type === "Config" && configName) return configName
  return label
}
