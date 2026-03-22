import type { ComponentProps } from "react"
import { Card, CardDescription, CardHeader } from "~/components/common/card"
import { H2 } from "~/components/common/heading"
import { Note } from "~/components/common/note"
import { findScheduledTools } from "~/server/admin/tools/queries"
import { Calendar } from "./calendar"

const ScheduledCard = async ({ ...props }: ComponentProps<typeof Card>) => {
  const ports = await findScheduledTools()

  return (
    <Card hover={false} focus={false} {...props}>
      <CardHeader direction="column">
        <CardDescription>Scheduled Ports</CardDescription>
        <H2>{ports.length}</H2>
      </CardHeader>

      {ports.length ? (
        <Calendar tools={ports} className="w-full h-full" />
      ) : (
        <Note>No scheduled ports at the moment.</Note>
      )}
    </Card>
  )
}

export { ScheduledCard }
