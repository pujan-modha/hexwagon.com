import { PortStatus } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { config } from "~/config"
import { indexPorts } from "~/lib/indexing"
import { notifySubmitterOfPortApproved } from "~/lib/notifications"
import { portOnePayload } from "~/server/web/ports/payloads"
import { inngest } from "~/services/inngest"

export const publishPorts = inngest.createFunction(
  { id: `${config.site.slug}.publish-ports` },
  { cron: "TZ=Europe/Warsaw */15 * * * *" }, // Every 15 minutes

  async ({ step, db, logger }) => {
    const ports = await step.run("fetch-ports", async () => {
      return await db.port.findMany({
        where: { status: PortStatus.Scheduled, publishedAt: { lte: new Date() } },
        select: portOnePayload,
      })
    })

    if (ports.length) {
      logger.info(`Publishing ${ports.length} ports`, { ports })

      for (const port of ports) {
        // Update port status
        await step.run(`update-port-status-${port.slug}`, async () => {
          return db.port.update({
            where: { id: port.id },
            data: { status: PortStatus.Published },
          })
        })

        // Run steps in parallel
        await Promise.all([
          // Revalidate cache
          step.run("revalidate-cache", async () => {
            revalidateTag(`port-${port.slug}`, "max")
          }),

          // Notify the submitter of the port published
          step.run(`send-email-${port.slug}`, async () => {
            const updatedPort = await db.port.findUnique({ where: { id: port.id } })
            if (updatedPort) {
              return notifySubmitterOfPortApproved(updatedPort)
            }
          }),
        ])
      }

      // Revalidate cache
      await step.run("revalidate-cache", async () => {
        revalidateTag("ports", "max")
        revalidateTag("schedule", "max")
      })
    }

    // Index ports
    await step.run("index-ports", async () => {
      await indexPorts({ where: { id: { in: ports.map(port => port.id) } } })
    })

    // Disconnect from DB
    await step.run("disconnect-from-db", async () => {
      return await db.$disconnect()
    })
  },
)
