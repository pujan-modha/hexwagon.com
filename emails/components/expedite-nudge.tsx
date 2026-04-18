import type { Port as Tool } from "@prisma/client"
import { Text } from "@react-email/components"
import type { PropsWithChildren } from "react"
import { config } from "~/config"
import { EmailButton } from "~/emails/components/button"
import { isToolWithinExpediteThreshold } from "~/lib/tools"

type EmailExpediteNudgeProps = PropsWithChildren<{
  port: Tool
}>

export const EmailExpediteNudge = ({ children, port }: EmailExpediteNudgeProps) => {
  const link = `${config.site.url}/submit/${port.slug}`

  if (isToolWithinExpediteThreshold(port)) {
    return null
  }

  return (
    <>
      <Text>
        Due to the high volume of submissions we're currently receiving, there's a bit of a queue.{" "}
        {port.name} is scheduled to be added {children}. However, if you'd like to fast-track your
        submission, you have the option to skip the queue.
      </Text>

      <EmailButton href={link}>Publish {port.name} sooner</EmailButton>
    </>
  )
}
