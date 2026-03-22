import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  portEdit: {
    editor: { email: string }
    port?: { name: string | null }
    adminNote?: string | null
  }
}

const EmailPortEditRejected = ({ portEdit, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey!</Text>

      <Text>
        Thank you for submitting an edit to <strong>{portEdit.port?.name ?? "this port"}</strong>. Unfortunately, we were unable to approve your edit at this time.
      </Text>

      {portEdit.adminNote && (
        <Text>
          Note: {portEdit.adminNote}
        </Text>
      )}

      <Text>
        If you have any questions, feel free to reach out to us.
      </Text>
    </EmailWrapper>
  )
}

export default EmailPortEditRejected
