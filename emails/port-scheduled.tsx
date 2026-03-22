import type { Port } from "@prisma/client"
import { Text } from "@react-email/components"
import { addHours, differenceInDays, format, formatDistanceToNowStrict } from "date-fns"
import { config } from "~/config"
import { EmailExpediteNudge } from "~/emails/components/expedite-nudge"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  port: Port
}

const EmailPortScheduled = ({ port, ...props }: EmailProps) => {
  const publishedAt = addHours(port.publishedAt || new Date(), 2)
  const isLongQueue = differenceInDays(publishedAt, new Date()) > 7
  const dateRelative = formatDistanceToNowStrict(publishedAt, { addSuffix: true })
  const dateFormatted = format(publishedAt, "MMMM do, yyyy")

  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {port.submitterName?.trim() ?? "there"}!</Text>

      <Text>
        Great news! Your port, <strong>{port.name}</strong>, was accepted and scheduled for publication on {config.site.name}.
      </Text>

      {isLongQueue ? (
        <EmailExpediteNudge port={port}>
          on <strong>{dateFormatted}</strong>
        </EmailExpediteNudge>
      ) : (
        <Text>
          {port.name} is scheduled to be added <strong>{dateRelative}</strong>.
        </Text>
      )}
    </EmailWrapper>
  )
}

export default EmailPortScheduled
