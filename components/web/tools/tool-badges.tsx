import type { ComponentProps } from "react"
import { Badge } from "~/components/common/badge"
import { Stack } from "~/components/common/stack"
import { VerifiedBadge } from "~/components/web/verified-badge"
import type { ToolOne } from "~/server/web/tools/payloads"

type ToolBadgesProps = ComponentProps<typeof Stack> & {
  tool: Pick<ToolOne, "isFeatured" | "isOfficial">
}

export const ToolBadges = ({ tool, ...props }: ToolBadgesProps) => {
  return (
    <Stack size="sm" {...props}>
      {tool.isOfficial && <VerifiedBadge size="sm" />}
      {tool.isFeatured && <Badge variant="info">Featured</Badge>}
    </Stack>
  )
}
