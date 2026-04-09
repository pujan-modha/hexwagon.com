import type { Ad } from "@prisma/client"
import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailButton } from "~/emails/components/button"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  ad: Ad
}

const EmailAdChangesRequested = ({ ad, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {ad.name}!</Text>

      <Text>
        We reviewed your ad booking for <strong>{ad.websiteUrl}</strong> and need a few updates
        before approval.
      </Text>

      {ad.adminNote && <Text>Notes from the team: {ad.adminNote}</Text>}

      <Text>
        Please update your ad details and submit it for review again. We will review the edited
        version as soon as it is resubmitted.
      </Text>

      <EmailButton href={`${config.site.url}/dashboard/ads`}>Edit and resubmit ad</EmailButton>
    </EmailWrapper>
  )
}

export default EmailAdChangesRequested
