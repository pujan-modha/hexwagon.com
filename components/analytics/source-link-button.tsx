"use client"

import type { ComponentProps } from "react"
import { ExternalLink } from "~/components/web/external-link"
import { trackEvent } from "~/hooks/use-analytics"

type SourceLinkButtonProps = {
  href: string
  eventName: "install_link_clicked" | "repo_link_clicked"
  eventProperties: { portId: string; installUrl?: string; repositoryUrl?: string }
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
    if (eventName === "install_link_clicked" && eventProperties.installUrl) {
      trackEvent({
        event: eventName,
        properties: {
          portId: eventProperties.portId,
          installUrl: eventProperties.installUrl,
        },
      })
    }

    if (eventName === "repo_link_clicked" && eventProperties.repositoryUrl) {
      trackEvent({
        event: eventName,
        properties: {
          portId: eventProperties.portId,
          repositoryUrl: eventProperties.repositoryUrl,
        },
      })
    }
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
