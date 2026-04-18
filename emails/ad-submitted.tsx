import type { Ad } from "@prisma/client"
import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailButton } from "~/emails/components/button"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  ad: Ad
}

const EmailAdSubmitted = ({ ad, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {ad.name}!</Text>

      <Text>
        We received your ad booking for <strong>{ad.websiteUrl}</strong> on {config.site.name}.
      </Text>

      <Text>Our team will review it shortly. We&apos;ll email you once it&apos;s approved.</Text>

      <Text>
        Campaign dates: {ad.startsAt.toLocaleDateString()} - {ad.endsAt.toLocaleDateString()}
        {typeof ad.priceCents === "number"
          ? ` (${(ad.priceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })})`
          : ""}
      </Text>

      <EmailButton href={`${config.site.url}/advertise`}>View advertising options</EmailButton>
    </EmailWrapper>
  )
}

export default EmailAdSubmitted
