import { millisecondsInMinute } from "date-fns/constants"
import { config } from "~/config"
import { indexPlatforms, indexPorts, indexThemes } from "~/lib/indexing"
import { inngest } from "~/services/inngest"

export const indexData = inngest.createFunction(
  { id: `${config.site.slug}.index-data`, retries: 0 },
  { cron: "TZ=Europe/Warsaw */15 * * * *" }, // Every 15 minutes

  async ({ step, db }) => {
    const timeThreshold = new Date(Date.now() - 15 * millisecondsInMinute)

    await Promise.all([
      step.run("index-ports", async () => {
        await indexPorts({ where: { updatedAt: { gte: timeThreshold } } })
      }),

      step.run("index-themes", async () => {
        await indexThemes({ where: { updatedAt: { gte: timeThreshold } } })
      }),

      step.run("index-platforms", async () => {
        await indexPlatforms({ where: { updatedAt: { gte: timeThreshold } } })
      }),
    ])

    // Disconnect from DB
    await step.run("disconnect-from-db", async () => {
      return await db.$disconnect()
    })
  },
)
