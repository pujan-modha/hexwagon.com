import type { Ad } from "@prisma/client"
import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailButton } from "~/emails/components/button"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  ad: Ad
  paymentUrl?: string
}

const EmailAdApproved = ({ ad, paymentUrl, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {ad.name}!</Text>

      <Text>
        Your ad for <strong>{ad.websiteUrl}</strong> has been approved on {config.site.name}.
      </Text>

      <Text>
        {paymentUrl
          ? "Your campaign is ready to launch. Complete payment using the secure link below to confirm your slot."
          : `It is now queued for the booked dates starting ${ad.startsAt.toLocaleDateString()}.`}
      </Text>

      <EmailButton href={paymentUrl ?? `${config.site.url}/advertise`}>
        {paymentUrl ? "Complete Payment" : "View advertising options"}
      </EmailButton>
    </EmailWrapper>
  )
}

export default EmailAdApproved
