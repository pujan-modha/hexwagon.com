import type { ComponentProps, ReactNode } from "react"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { H5 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Stack } from "~/components/common/stack"
import { ExternalLink } from "~/components/web/external-link"
import { Insights } from "~/components/web/ui/insights"
import { cx } from "~/utils/cva"

type EntitySidebarInsight = {
  label: string
  value: ReactNode
  link?: string
  title?: string
  icon?: ReactNode
}

type EntitySidebarCardProps = ComponentProps<typeof Card> & {
  title: string
  insights: EntitySidebarInsight[]
  buttonHref?: string
  buttonLabel?: string
  footer?: ReactNode
}

export const EntitySidebarCard = ({
  title,
  insights,
  buttonHref,
  buttonLabel,
  footer,
  className,
  ...props
}: EntitySidebarCardProps) => {
  return (
    <Card hover={false} focus={false} className={cx("items-stretch bg-transparent", className)} {...props}>
      <Stack direction="column">
        <Stack size="sm" className="w-full justify-between">
          <H5 as="strong">{title}</H5>
        </Stack>

        <Insights insights={insights} className="text-sm" />
      </Stack>

      {buttonHref && buttonLabel && (
        <Button
          size="md"
          variant="secondary"
          prefix={<Icon name="lucide/arrow-up-right" />}
          className="mt-1 self-start"
          asChild
        >
          <ExternalLink href={buttonHref}>{buttonLabel}</ExternalLink>
        </Button>
      )}

      {footer && <p className="text-muted-foreground/75 text-[11px]">{footer}</p>}
    </Card>
  )
}