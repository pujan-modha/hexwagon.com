import {
  findPortBySlug,
  findPortList,
  findPorts,
  findScheduledPorts,
} from "~/server/admin/ports/queries"
import type { PortsTableSchema } from "~/server/admin/ports/schema"

export const findTools = (search: PortsTableSchema, where?: Parameters<typeof findPorts>[1]) =>
  findPorts(search, where)

export const findScheduledTools = findScheduledPorts
export const findToolList = findPortList
export const findToolBySlug = findPortBySlug
