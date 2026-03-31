"use server"

import { ThemeMaintainerClaimStatus } from "@prisma/client"
import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

export const approveThemeMaintainerClaim = adminProcedure
  .createServerAction()
  .input(
    z.object({
      claimId: z.string(),
      adminNote: z.string().optional(),
    }),
  )
  .handler(async ({ input: { claimId, adminNote }, ctx: { user } }) => {
    const claim = await db.themeMaintainerClaim.findUnique({
      where: { id: claimId },
      include: {
        theme: { select: { id: true, slug: true } },
      },
    })

    if (!claim) {
      throw new Error("Claim request not found")
    }

    if (claim.status !== ThemeMaintainerClaimStatus.Pending) {
      throw new Error("Claim request has already been reviewed")
    }

    const requesterId = claim.requesterId
      ? claim.requesterId
      : (await db.user.findUnique({
          where: { email: claim.claimantEmail },
          select: { id: true },
        }))?.id

    if (!requesterId) {
      throw new Error("Claimant must have an account before approval")
    }

    await db.$transaction([
      db.themeMaintainer.upsert({
        where: {
          userId_themeId: {
            userId: requesterId,
            themeId: claim.themeId,
          },
        },
        create: {
          userId: requesterId,
          themeId: claim.themeId,
        },
        update: {},
      }),

      db.themeMaintainerClaim.update({
        where: { id: claim.id },
        data: {
          status: ThemeMaintainerClaimStatus.Approved,
          adminNote: adminNote || null,
          reviewedAt: new Date(),
          reviewerId: user.id,
        },
      }),
    ])

    revalidatePath("/admin")
    revalidatePath("/admin/theme-claims")
    revalidatePath(`/admin/themes/${claim.theme.slug}`)
    revalidateTag(`theme-${claim.theme.slug}`, "max")

    return { success: true }
  })

export const rejectThemeMaintainerClaim = adminProcedure
  .createServerAction()
  .input(
    z.object({
      claimId: z.string(),
      adminNote: z.string().optional(),
    }),
  )
  .handler(async ({ input: { claimId, adminNote }, ctx: { user } }) => {
    const claim = await db.themeMaintainerClaim.findUnique({
      where: { id: claimId },
      include: { theme: { select: { slug: true } } },
    })

    if (!claim) {
      throw new Error("Claim request not found")
    }

    if (claim.status !== ThemeMaintainerClaimStatus.Pending) {
      throw new Error("Claim request has already been reviewed")
    }

    await db.themeMaintainerClaim.update({
      where: { id: claim.id },
      data: {
        status: ThemeMaintainerClaimStatus.Rejected,
        adminNote: adminNote || null,
        reviewedAt: new Date(),
        reviewerId: user.id,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/admin/theme-claims")
    revalidatePath(`/admin/themes/${claim.theme.slug}`)

    return { success: true }
  })
