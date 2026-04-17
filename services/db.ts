import { Prisma, PrismaClient } from "@prisma/client"

const schemaMarker = Prisma.dmmf.datamodel.models
  .map(model => `${model.name}:${model.fields.map(field => field.name).join(",")}`)
  .join("|")

const globalForPrisma = global as unknown as {
  db?: PrismaClient
  dbSchemaMarker?: string
}

if (!globalForPrisma.db || globalForPrisma.dbSchemaMarker !== schemaMarker) {
  void globalForPrisma.db?.$disconnect().catch(() => undefined)
  globalForPrisma.db = new PrismaClient()
  globalForPrisma.dbSchemaMarker = schemaMarker
}

export const db = globalForPrisma.db
