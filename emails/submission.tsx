import type { Port as Tool } from "@prisma/client"
import { Text } from "@react-email/components"
import { EmailExpediteNudge } from "~/emails/components/expedite-nudge"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"
import { getQueueLength } from "~/lib/products"

type EmailProps = EmailWrapperProps & {
  tool: Tool
  queueLength?: number
}

const EmailSubmission = ({ tool, queueLength = 100, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {tool.submitterName?.trim()}!</Text>

      <Text>Thanks for submitting {tool.name}, it will be reviewed shortly!</Text>

      {queueLength > 10 && (
        <EmailExpediteNudge port={tool}>
          in approximately <strong>{getQueueLength(queueLength)}</strong>
        </EmailExpediteNudge>
      )}
    </EmailWrapper>
  )
}

export default EmailSubmission
