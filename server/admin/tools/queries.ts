import type { PortsTableSchema } from "~/server/admin/ports/schema"
import {
  findPortBySlug,
  findPortList,
  findPorts,
  findScheduledPorts,
} from "~/server/admin/ports/queries"

export const findTools = (search: PortsTableSchema, where?: Parameters<typeof findPorts>[1]) =>
  findPorts(search, where)

export const findScheduledTools = findScheduledPorts
export const findToolList = findPortList
export const findToolBySlug = findPortBySlug
