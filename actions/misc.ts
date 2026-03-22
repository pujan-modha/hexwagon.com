"use server"

import { PortStatus } from "@prisma/client"
import { revalidateTag } from "next/cache"
import { indexPorts, indexThemes, indexPlatforms } from "~/lib/indexing"
import { getPortRepositoryData } from "~/lib/repositories"
import { adminProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

export const fetchRepositoryData = adminProcedure.createServerAction().handler(async () => {
  const ports = await db.port.findMany({
    where: {
      status: { in: [PortStatus.Scheduled, PortStatus.Published] },
    },
  })

  if (ports.length === 0) {
    return { success: false, message: "No ports found" }
  }

  await Promise.allSettled(
    ports.map(async port => {
      if (!port.repositoryUrl) return null

      const result = await tryCatch(getPortRepositoryData(port.repositoryUrl))

      if (result.error) {
        console.error(`Failed to fetch repository data for ${port.slug}`, {
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

  revalidateTag("ports", "max")
})

export const indexAllData = adminProcedure.createServerAction().handler(async () => {
  await Promise.all([indexPorts({}), indexThemes({}), indexPlatforms({})])
})

export const recalculatePricesData = adminProcedure.createServerAction().handler(async () => {
  return { success: true, message: "Price recalculation is no longer required for ports." }
})
