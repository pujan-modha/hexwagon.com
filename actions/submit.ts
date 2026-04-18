"use server"

import { slugify } from "@primoui/utils"
import { ConfigStatus, PortStatus, Prisma } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"
import { after } from "next/server"
import { subscribeToNewsletter } from "~/actions/subscribe"
import { notifySubmitterOfPortApproved, notifySubmitterOfPortSubmitted } from "~/lib/notifications"
import { isRateLimited } from "~/lib/rate-limiter"
import { userProcedure } from "~/lib/safe-actions"
import { submitConfigSchema, submitPortSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"

const findLinkedEntitySlugs = async (themeIds: string[], platformIds: string[]) => {
  const [themes, platforms] = await Promise.all([
    themeIds.length
      ? db.theme.findMany({
          where: { id: { in: themeIds } },
          select: { slug: true },
        })
      : Promise.resolve([]),
    platformIds.length
      ? db.platform.findMany({
          where: { id: { in: platformIds } },
          select: { slug: true },
        })
      : Promise.resolve([]),
  ])

  return {
    themeSlugs: themes.map(theme => theme.slug),
    platformSlugs: platforms.map(platform => platform.slug),
  }
}

/**
 * Submit a port to the database
 */
export const submitPort = userProcedure
  .createServerAction()
  .input(submitPortSchema)
  .handler(async ({ input: { newsletterOptIn, ...data }, ctx: { user } }) => {
    const submitterName = user.name?.trim() || null
    const submitterEmail = user.email?.trim() || null

    const rateLimitKey = `submission:${user.id}`
    if (await isRateLimited(rateLimitKey, "submission")) {
      throw new Error("Too many submissions. Please try again later.")
    }

    const isThemeMaintainer =
      user.role === "admin" ||
      Boolean(
        await db.themeMaintainer.findUnique({
          where: {
            userId_themeId: {
              userId: user.id,
              themeId: data.themeId,
            },
          },
          select: { id: true },
        }),
      )

    if (newsletterOptIn && submitterEmail) {
      await subscribeToNewsletter({
        value: submitterEmail,
        utm_medium: "submit_form",
        send_welcome_email: false,
      })
    }

    // Check for duplicate submission (same user + theme + platform with pending status)
    const existingPort = await db.port.findFirst({
      where: {
        themeId: data.themeId,
        platformId: data.platformId,
        authorId: user.id,
        status: { in: ["Draft", "PendingEdit"] },
      },
    })

    if (existingPort) {
      throw new Error("You already have a pending submission for this theme+platform.")
    }

    const authorId = user.id
    const baseSlug = slugify(data.name)

    const port = await (async () => {
      const maxSlugAttempts = 25

      for (let attempt = 0; attempt < maxSlugAttempts; attempt++) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`

        try {
          return await db.port.create({
            data: {
              ...data,
              submitterName,
              submitterEmail,
              slug,
              authorId,
              ...(isThemeMaintainer
                ? {
                    status: PortStatus.Published,
                    publishedAt: new Date(),
                  }
                : {}),
            },
          })
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes("slug")
          ) {
            continue
          }

          throw error
        }
      }

      throw new Error("Could not reserve a unique slug. Please try submitting again.")
    })()

    if (isThemeMaintainer) {
      revalidateTag("ports", "max")
      revalidateTag(`port-${port.slug}`, "max")
      after(async () => await notifySubmitterOfPortApproved(port))
    } else {
      after(async () => await notifySubmitterOfPortSubmitted(port))
    }

    return port
  })

export const submitConfig = userProcedure
  .createServerAction()
  .input(submitConfigSchema)
  .handler(
    async ({
      input: { newsletterOptIn, themeIds, platformIds, fonts, screenshots, ...data },
      ctx: { user },
    }) => {
      const rateLimitKey = `submission:${user.id}`
      if (await isRateLimited(rateLimitKey, "submission")) {
        throw new Error("Too many submissions. Please try again later.")
      }

      const submitterEmail = user.email?.trim() || null
      const isAdmin = user.role === "admin"
      const normalizedRepositoryUrl = data.repositoryUrl.trim()
      const normalizedLicense = data.license?.trim() || null

      if (newsletterOptIn && submitterEmail) {
        await subscribeToNewsletter({
          value: submitterEmail,
          utm_medium: "submit_form",
          send_welcome_email: false,
        })
      }

      const existingConfig = await db.config.findFirst({
        where: {
          authorId: user.id,
          repositoryUrl: normalizedRepositoryUrl,
          status: ConfigStatus.Draft,
        },
        select: { id: true },
      })

      if (existingConfig) {
        throw new Error("You already have a pending config submission for this repository.")
      }

      const baseSlug = slugify(data.name)
      const { themeSlugs, platformSlugs } = await findLinkedEntitySlugs(themeIds, platformIds)

      const config = await (async () => {
        const maxSlugAttempts = 25

        for (let attempt = 0; attempt < maxSlugAttempts; attempt++) {
          const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`

          try {
            return await db.$transaction(async tx => {
              const createdConfig = await tx.config.create({
                data: {
                  name: data.name,
                  description: data.description,
                  content: data.content,
                  repositoryUrl: normalizedRepositoryUrl,
                  screenshotUrl: screenshots[0] ?? null,
                  screenshots,
                  fonts,
                  license: normalizedLicense,
                  submitterNote: data.submitterNote || null,
                  slug,
                  authorId: user.id,
                  ...(isAdmin
                    ? {
                        status: ConfigStatus.Published,
                      }
                    : {}),
                },
              })

              await tx.configTheme.createMany({
                data: themeIds.map((themeId, index) => ({
                  configId: createdConfig.id,
                  themeId,
                  isPrimary: index === 0,
                  order: index,
                })),
              })

              await tx.configPlatform.createMany({
                data: platformIds.map((platformId, index) => ({
                  configId: createdConfig.id,
                  platformId,
                  isPrimary: index === 0,
                  order: index,
                })),
              })

              return createdConfig
            })
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002" &&
              Array.isArray(error.meta?.target) &&
              error.meta.target.includes("slug")
            ) {
              continue
            }

            throw error
          }
        }

        throw new Error("Could not reserve a unique slug. Please try submitting again.")
      })()

      revalidatePath("/dashboard")
      revalidatePath("/admin/configs")

      if (isAdmin) {
        revalidateTag("configs", "max")
        revalidateTag(`config-${config.slug}`, "max")

        for (const themeSlug of themeSlugs) {
          revalidateTag(`theme-${themeSlug}`, "max")
        }

        for (const platformSlug of platformSlugs) {
          revalidateTag(`platform-${platformSlug}`, "max")
        }
      }

      return config
    },
  )

export const submitTool = submitPort
