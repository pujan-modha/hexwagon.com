import { millisecondsInMinute } from "date-fns/constants"
import { config } from "~/config"
import { indexConfigs, indexPlatforms, indexPorts, indexThemes } from "~/lib/indexing"
import { inngest } from "~/services/inngest"

const INDEX_CRON_SCHEDULE = process.env.INDEX_CRON_SCHEDULE ?? "TZ=Europe/Warsaw 0 * * * *"
const isIndexCronEnabled = process.env.ENABLE_INDEX_CRON !== "false"
const indexLookbackMinutes = Number.parseInt(process.env.INDEX_LOOKBACK_MINUTES ?? "90", 10)

export const indexData = inngest.createFunction(
  { id: `${config.site.slug}.index-data`, retries: 0 },
  { cron: INDEX_CRON_SCHEDULE },

  async ({ step, db }) => {
    if (!isIndexCronEnabled) {
      return
    }

    const safeLookbackMinutes = Number.isFinite(indexLookbackMinutes)
      ? Math.max(indexLookbackMinutes, 15)
      : 90
    const timeThreshold = new Date(Date.now() - safeLookbackMinutes * millisecondsInMinute)

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

      step.run("index-configs", async () => {
        await indexConfigs({ where: { updatedAt: { gte: timeThreshold } } })
      }),
    ])

    // Disconnect from DB
    await step.run("disconnect-from-db", async () => {
      return await db.$disconnect()
    })
  },
)
