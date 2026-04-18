import { ThemeMaintainerClaimStatus } from "@prisma/client"
import { db } from "~/services/db"

export const findThemeMaintainerClaims = async () => {
  return db.themeMaintainerClaim.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      theme: { select: { id: true, slug: true, name: true } },
      requester: { select: { id: true, name: true, email: true, image: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  })
}

export const findPendingThemeMaintainerClaims = async (take = 5) => {
  return db.themeMaintainerClaim.findMany({
    where: { status: ThemeMaintainerClaimStatus.Pending },
    orderBy: [{ createdAt: "asc" }],
    take,
    include: {
      theme: { select: { id: true, slug: true, name: true } },
      requester: { select: { id: true, name: true, email: true } },
    },
  })
}

export const countPendingThemeMaintainerClaims = async () => {
  return db.themeMaintainerClaim.count({
    where: { status: ThemeMaintainerClaimStatus.Pending },
  })
}
