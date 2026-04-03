import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  portEdit: {
    editor: { email: string }
    port: { name: string | null }
  }
}

const EmailPortEditApproved = ({ portEdit, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey!</Text>

      <Text>
        Great news! Your edit to <strong>{portEdit.port.name ?? "this port"}</strong> has been
        approved and published.
      </Text>

      <Text>Thank you for keeping {config.site.name} up to date!</Text>
    </EmailWrapper>
  )
}

export default EmailPortEditApproved
