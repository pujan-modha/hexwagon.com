import type { PlatformOne } from "~/server/web/platforms/payloads"
import { MarkdownContent } from "./markdown-content"

type PlatformThemeDocsTabProps = {
  platform: Pick<PlatformOne, "themeCreationDocs">
}

const PlatformThemeDocsTab = ({ platform }: PlatformThemeDocsTabProps) => {
  return (
    <MarkdownContent
      content={platform.themeCreationDocs ?? undefined}
      emptyState="No theme creation documentation available for this platform yet."
    />
  )
}

export { PlatformThemeDocsTab }
