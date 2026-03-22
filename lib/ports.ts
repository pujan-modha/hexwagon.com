import type { Port } from "@prisma/client"
import { PortStatus } from "@prisma/client"
import { config } from "~/config"

/**
 * Check if a port is published.
 */
export const isPortPublished = (port: Pick<Port, "status">) => {
  return port.status === PortStatus.Published
}

/**
 * Get the suffix for a port (title helper).
 */
export const getPortSuffix = (port: { theme?: { name: string }; platform?: { name: string } }) => {
  if (!port.theme || !port.platform) return ""
  return `${port.theme.name} for ${port.platform.name}`
}
