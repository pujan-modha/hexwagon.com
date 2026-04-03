import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  entityType: string
}

const EmailReportAcknowledged = ({ entityType, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Your report has been received.</Text>

      <Text>
        Thanks for reporting this {entityType.toLowerCase()} on {config.site.name}. Our moderation
        team will review it and take action if needed.
      </Text>

      <Text>We appreciate your help keeping {config.site.name} useful and safe for everyone.</Text>
    </EmailWrapper>
  )
}

export default EmailReportAcknowledged
