import { PortStatus } from "@prisma/client"
import { NonRetriableError } from "inngest"
import { revalidateTag } from "next/cache"
import { config } from "~/config"
import { getMilestoneReached } from "~/lib/milestones"
import { getPortRepositoryData } from "~/lib/repositories"
import { getPostTemplate, sendSocialPost } from "~/lib/socials"
import { inngest } from "~/services/inngest"
import { tryCatch } from "~/utils/helpers"

export const fetchData = inngest.createFunction(
  { id: `${config.site.slug}.fetch-data`, retries: 0 },
  { cron: "TZ=Europe/Warsaw 0 0 * * *" }, // Every day at midnight

  async ({ step, db, logger }) => {
    const [ports, themes, platforms] = await Promise.all([
      step.run("fetch-ports", async () => {
        return await db.port.findMany({
          where: { status: { in: [PortStatus.Published, PortStatus.Scheduled] } },
        })
      }),

      step.run("fetch-themes", async () => {
        return await db.theme.findMany()
      }),

      step.run("fetch-platforms", async () => {
        return await db.platform.findMany()
      }),
    ])

    // Fetch repository data and handle milestones
    await step.run("fetch-repository-data", async () => {
      return await Promise.allSettled(
        ports.map(async port => {
          if (!port.repositoryUrl) return null

          const result = await tryCatch(getPortRepositoryData(port.repositoryUrl))

          if (result.error) {
            logger.error(`Failed to fetch repository data for ${port.name}`, {
              error: result.error,
              slug: port.slug,
            })

            return null
          }

          if (!result.data) {
            return null
          }

          await db.port.update({
            where: { id: port.id },
            data: result.data,
          })
        }),
      )
    })

    // Post on Socials about a random port
    await step.run("post-on-socials", async () => {
      const publishedPorts = ports.filter(port => port.status === PortStatus.Published)
      const port = publishedPorts[Math.floor(Math.random() * publishedPorts.length)]

      if (port) {
        const template = await getPostTemplate(port)
        const result = await tryCatch(sendSocialPost(template, port))

        if (result.error) {
          throw new NonRetriableError(
            result.error instanceof Error ? result.error.message : "Unknown error",
          )
        }

        return result.data
      }
    })

    // Disconnect from DB
    await step.run("disconnect-from-db", async () => {
      return await db.$disconnect()
    })

    // Revalidate cache
    await step.run("revalidate-cache", async () => {
      revalidateTag("ports", "max")
      revalidateTag("port", "max")
      revalidateTag("themes", "max")
      revalidateTag("platforms", "max")
    })
  },
)
