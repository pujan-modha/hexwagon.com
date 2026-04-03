import type { ComponentProps } from "react"
import { Card } from "~/components/common/card"
import { Link } from "~/components/common/link"
import { ToolBadges } from "~/components/web/tools/tool-badges"
import type { ToolOne } from "~/server/web/tools/payloads"

type ToolEntryProps = ComponentProps<"article"> & {
  id?: string
  tool: ToolOne & { screenshotUrl?: string | null }
}

export const ToolEntry = ({ id, tool, ...props }: ToolEntryProps) => {
  return (
    <Card asChild hover={false} focus={false}>
      <article id={id} {...props}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              href={`/themes/${tool.theme.slug}/${tool.platform.slug}/${tool.id}`}
              className="font-semibold"
            >
              {tool.name ?? `${tool.theme.name} for ${tool.platform.name}`}
            </Link>
            {tool.description && (
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            )}
          </div>

          <ToolBadges tool={tool} />
        </div>
      </article>
    </Card>
  )
}
