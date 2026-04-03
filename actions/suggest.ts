"use server"

import { after } from "next/server"
import { notifySubmitterOfSuggestionSubmitted } from "~/lib/notifications"
import { getIP, isRateLimited } from "~/lib/rate-limiter"
import { userProcedure } from "~/lib/safe-actions"
import { submitSuggestionSchema } from "~/server/web/shared/schema"
import { db } from "~/services/db"

export const submitSuggestion = userProcedure
  .createServerAction()
  .input(submitSuggestionSchema)
  .handler(async ({ input, ctx: { user } }) => {
    const ip = await getIP()

    // Rate limit: max 5 suggestions per user per 24h
    if (await isRateLimited(`suggestion:${ip}`, "submission")) {
      throw new Error("Too many suggestions. Please try again later.")
    }

    const suggestion = await db.suggestion.create({
      data: { ...input, submitterId: user.id },
      include: { submitter: true },
    })

    after(async () => {
      await notifySubmitterOfSuggestionSubmitted(suggestion)
    })

    return suggestion
  })
