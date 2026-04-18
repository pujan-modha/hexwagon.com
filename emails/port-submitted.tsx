import type { Port } from "@prisma/client"
import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  port: Port
  queueLength?: number
}

const EmailPortSubmitted = ({ port, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {port.submitterName?.trim() ?? "there"}!</Text>

      <Text>
        Thanks for submitting <strong>{port.name}</strong>! It will be reviewed shortly.
      </Text>

      <Text>We&apos;ll send you an email once your port is approved.</Text>
    </EmailWrapper>
  )
}

export default EmailPortSubmitted
