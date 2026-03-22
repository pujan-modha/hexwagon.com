import { Prisma } from "@prisma/client"
import {
  portManyExtendedPayload,
  portManyPayload,
  portOnePayload,
} from "~/server/web/ports/payloads"

export const toolOnePayload = portOnePayload
export const toolManyPayload = portManyPayload
export const toolManyExtendedPayload = portManyExtendedPayload
export const toolAlternativesPayload = Prisma.validator<Prisma.ThemeSelect>()({
  name: true,
  slug: true,
})

export type { PortMany as ToolMany, PortManyExtended as ToolManyExtended, PortOne as ToolOne } from "~/server/web/ports/payloads"
