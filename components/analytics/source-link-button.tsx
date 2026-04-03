"use client"

import type { ComponentProps } from "react"
import { ExternalLink } from "~/components/web/external-link"
import { trackEvent } from "~/hooks/use-analytics"

type SourceLinkButtonProps = {
  href: string
  eventName: "repo_link_clicked"
  eventProperties: { portId: string; repositoryUrl: string }
  children: React.ReactNode
} & Omit<ComponentProps<typeof ExternalLink>, "eventName" | "eventProps">

const SourceLinkButton = ({
  href,
  eventName,
  eventProperties,
  children,
  ...props
}: SourceLinkButtonProps) => {
  const handleClick = () => {
    trackEvent({
      event: eventName,
      properties: {
        portId: eventProperties.portId,
        repositoryUrl: eventProperties.repositoryUrl,
      },
    })
  }

  return (
    <ExternalLink
      href={href}
      eventName={eventName}
      eventProps={eventProperties}
      onClick={handleClick}
      {...props}
    >
      {children}
    </ExternalLink>
  )
}

export { SourceLinkButton }
