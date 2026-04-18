import type { Port } from "@prisma/client"
import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  port: Port
}

const EmailPortRejected = ({ port, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {port.submitterName?.trim() ?? "there"}!</Text>

      <Text>
        Thank you for submitting <strong>{port.name}</strong> to {config.site.name}. Unfortunately,
        we were unable to approve this port at this time.
      </Text>

      {port.rejectionReason && <Text>Reason: {port.rejectionReason}</Text>}

      <Text>If you have any questions, feel free to reach out to us.</Text>
    </EmailWrapper>
  )
}

export default EmailPortRejected
