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

const EmailSuggestionApproved = ({ suggestion, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {suggestion.submitter?.name ?? "there"}!</Text>

      <Text>
        Great news! Your suggestion, <strong>{suggestion.name}</strong>, has been approved!
      </Text>

      <Text>
        It will now appear on {config.site.name}.
      </Text>
    </EmailWrapper>
  )
}

export default EmailSuggestionApproved
