import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type SuggestionEmailData = {
  name: string
  submitter?: {
    name: string
  } | null
}

type EmailProps = EmailWrapperProps & {
  suggestion: SuggestionEmailData
}

const EmailSuggestionSubmitted = ({ suggestion, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {suggestion.submitter?.name ?? "there"}!</Text>

      <Text>
        Thanks for suggesting <strong>{suggestion.name}</strong>! We&apos;ll review it shortly.
      </Text>

      <Text>We&apos;ll send you an email once your suggestion is reviewed.</Text>
    </EmailWrapper>
  )
}

export default EmailSuggestionSubmitted
