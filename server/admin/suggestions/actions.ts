"use server"

import { revalidateTag } from "next/cache"
import { z } from "zod"
import {
  notifySubmitterOfSuggestionApproved,
  notifySubmitterOfSuggestionRejected,
} from "~/lib/notifications"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

export const approveSuggestion = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input: { id } }) => {
    const suggestion = await db.suggestion.update({
      where: { id },
      data: { status: "Approved" },
      include: { submitter: true },
    })

    revalidateTag("suggestions", "max")

    await notifySubmitterOfSuggestionApproved(suggestion)

    return suggestion
  })

export const rejectSuggestion = adminProcedure
  .createServerAction()
  .input(z.object({ id: z.string(), adminNote: z.string().optional() }))
  .handler(async ({ input: { id, adminNote } }) => {
    const suggestion = await db.suggestion.update({
      where: { id },
      data: { status: "Rejected", adminNote },
      include: { submitter: true },
    })

    revalidateTag("suggestions", "max")

    await notifySubmitterOfSuggestionRejected(suggestion)

    return suggestion
  })

export const deleteSuggestions = adminProcedure
  .createServerAction()
  .input(z.object({ ids: z.array(z.string()) }))
  .handler(async ({ input: { ids } }) => {
    await db.suggestion.deleteMany({
      where: { id: { in: ids } },
    })

    revalidateTag("suggestions", "max")

    return true
  })
