import type { ThemeOne } from "~/server/web/themes/payloads"
import { MarkdownContent } from "./markdown-content"

type ThemeGuidelinesTabProps = {
  theme: Pick<ThemeOne, "guidelines">
}

const ThemeGuidelinesTab = ({ theme }: ThemeGuidelinesTabProps) => {
  return (
    <MarkdownContent
      content={theme.guidelines ?? undefined}
      emptyState="No guidelines available for this theme yet."
    />
  )
}

export { ThemeGuidelinesTab }
