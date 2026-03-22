"use server"

import { getUrlHostname, slugify } from "@primoui/utils"
import { headers } from "next/headers"
import { after } from "next/server"
import { createServerAction } from "zsa"
import { subscribeToNewsletter } from "~/actions/subscribe"
import { auth } from "~/lib/auth"
import { notifySubmitterOfPortSubmitted } from "~/lib/notifications"
import { getIP, isRateLimited } from "~/lib/rate-limiter"
import { submitPortSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"
import { isDisposableEmail } from "~/utils/helpers"

/**
 * Generates a unique slug by adding a numeric suffix if needed
 */
const generateUniqueSlug = async (baseName: string): Promise<string> => {
  const baseSlug = slugify(baseName)
  let slug = baseSlug
  let suffix = 2

  while (true) {
    if (!(await db.port.findUnique({ where: { slug } }))) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix++
  }
}

/**
 * Submit a port to the database
 */
export const submitPort = createServerAction()
  .input(submitPortSchema)
  .handler(async ({ input: { newsletterOptIn, ...data } }) => {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      const ip = await getIP()
      const rateLimitKey = `submission:${ip}`

      if (await isRateLimited(rateLimitKey, "submission")) {
        throw new Error("Too many submissions. Please try again later.")
      }

      if (await isDisposableEmail(data.submitterEmail)) {
        throw new Error("Invalid email address, please use a real one")
      }
    }

    if (newsletterOptIn) {
      await subscribeToNewsletter({
        value: data.submitterEmail,
        utm_medium: "submit_form",
        send_welcome_email: false,
      })
    }

    // Check for duplicate submission (same user + theme + platform with pending status)
    if (session?.user) {
      const existingPort = await db.port.findFirst({
        where: {
          themeId: data.themeId,
          platformId: data.platformId,
          authorId: session.user.id,
          status: { in: ["Draft", "PendingEdit"] },
        },
      })

      if (existingPort) {
        throw new Error("You already have a pending submission for this theme+platform.")
      }
    }

    // Generate a unique slug
    const slug = await generateUniqueSlug(data.name)

    // Check if the email domain matches the website domain for ownership
    const authorId = session?.user.id

    // Save the port to the database
    const port = await db.port.create({
      data: { ...data, slug, authorId },
    })

    after(async () => await notifySubmitterOfPortSubmitted(port))

    return port
  })

export const submitTool = submitPort
