"use server"

import { MissingSuggestionStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

export const updateMissingSuggestionStatus = adminProcedure
  .createServerAction()
  .input(
    z.object({
      id: z.string().min(1),
      status: z.nativeEnum(MissingSuggestionStatus),
    }),
  )
  .handler(async ({ input }) => {
    const suggestion = await db.missingSuggestion.update({
      where: { id: input.id },
      data: { status: input.status },
    })

    revalidatePath("/admin/missing-suggestions")
    revalidatePath("/search")

    return suggestion
  })
