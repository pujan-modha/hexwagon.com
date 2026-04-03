import type { Port } from "@prisma/client"
import { Text } from "@react-email/components"
import { config } from "~/config"
import { EmailButton } from "~/emails/components/button"
import { EmailWrapper, type EmailWrapperProps } from "~/emails/components/wrapper"

type EmailProps = EmailWrapperProps & {
  port: Port
}

const EmailPortApproved = ({ port, ...props }: EmailProps) => {
  return (
    <EmailWrapper signature {...props}>
      <Text>Hey {port.submitterName?.trim() ?? "there"}!</Text>

      <Text>
        Great news! Your port, <strong>{port.name}</strong>, has been published on{" "}
        {config.site.name}!
      </Text>

      <EmailButton href={`${config.site.url}/dashboard`}>
        View your port on {config.site.name}
      </EmailButton>
    </EmailWrapper>
  )
}

export default EmailPortApproved
