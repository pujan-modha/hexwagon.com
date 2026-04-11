"use server"

import { indexPlatforms, indexPorts, indexThemes } from "~/lib/indexing"
import { adminProcedure } from "~/lib/safe-actions"

export const indexAllData = adminProcedure.createServerAction().handler(async () => {
  await Promise.all([
    indexPorts({ replace: true }),
    indexThemes({ replace: true }),
    indexPlatforms({ replace: true }),
  ])
})

export const recalculatePricesData = adminProcedure.createServerAction().handler(async () => {
  return {
    success: true,
    message: "Price recalculation is no longer required for ports.",
  }
})
