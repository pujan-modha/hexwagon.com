import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type SuggestionEmailData = {
  name: string
  adminNote?: string | null
  submitter?: {
    name: string
  } | null
}

type EmailProps = EmailWrapperProps & {
  suggestion: SuggestionEmailData
}

const EmailSuggestionRejected = ({ suggestion, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {suggestion.submitter?.name ?? "there"}!</Text>

      <Text>
        Thank you for suggesting <strong>{suggestion.name}</strong>. Unfortunately, we were unable
        to approve this suggestion at this time.
      </Text>

      {suggestion.adminNote && <Text>Note: {suggestion.adminNote}</Text>}

      <Text>If you have any questions, feel free to reach out to us.</Text>
    </EmailWrapper>
  )
}

export default EmailSuggestionRejected
