import type { Port } from "@prisma/client"
import { differenceInDays } from "date-fns"
import { config } from "~/config"
import { getPortSuffix, isPortPublished } from "~/lib/ports"

/**
 * @deprecated Use isPortPublished from ~/lib/ports instead.
 */
export const isToolPublished = (tool: Pick<Port, "status">) => {
  return isPortPublished(tool)
}

/**
 * @deprecated Use getPortSuffix from ~/lib/ports instead.
 */
export const getToolSuffix = (port: { theme?: { name: string }; platform?: { name: string } }) => {
  return getPortSuffix(port)
}

/**
 * Check if a tool is within the expedite threshold.
 *
 * @param tool - The tool to check.
 * @returns Whether the tool is within the expedite threshold.
 */
export const isToolWithinExpediteThreshold = (tool: Pick<Port, "publishedAt">) => {
  const threshold = config.submissions.expediteThresholdDays
  return tool.publishedAt && differenceInDays(tool.publishedAt, new Date()) < threshold
}
