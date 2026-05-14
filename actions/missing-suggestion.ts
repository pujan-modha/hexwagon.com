"use server"

import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { createServerAction } from "zsa"
import {
  buildMissingSuggestionLabel,
  normalizeMissingSuggestionText,
} from "~/lib/missing-suggestions"
import { getIP, isRateLimited } from "~/lib/rate-limiter"
import {
  type MissingSuggestionSchema,
  missingSuggestionLinkSchema,
  missingSuggestionSchema,
} from "~/server/web/shared/schema"
import { db } from "~/services/db"

const VISITOR_COOKIE = "hexwagon_missing_suggestion_visitor"

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex")

const getVisitorKeyHash = async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const ip = await getIP()
  const userAgent = headerStore.get("user-agent") ?? "unknown"
  const existingVisitorId = cookieStore.get(VISITOR_COOKIE)?.value
  const visitorId = existingVisitorId || randomUUID()

  if (!existingVisitorId) {
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return hashValue(`${ip}:${userAgent}:${visitorId}`)
}

const buildSuggestionData = (input: MissingSuggestionSchema) => {
  const label = buildMissingSuggestionLabel(input)
  const normalizedLabel = normalizeMissingSuggestionText(label)
  const normalizedTheme = normalizeMissingSuggestionText(input.themeName)
  const normalizedPlatform = normalizeMissingSuggestionText(input.platformName)
  const normalizedConfig = normalizeMissingSuggestionText(input.configName)

  return {
    type: input.type,
    label,
    normalizedLabel,
    themeName: input.themeName || null,
    normalizedTheme,
    platformName: input.platformName || null,
    normalizedPlatform,
    configName: input.configName || null,
    normalizedConfig,
    themeId: input.themeId || null,
    platformId: input.platformId || null,
  }
}

const findOrCreateMissingSuggestion = async (input: MissingSuggestionSchema) => {
  const data = buildSuggestionData(input)
  const where = {
    type_normalizedLabel_normalizedTheme_normalizedPlatform_normalizedConfig: {
      type: data.type,
      normalizedLabel: data.normalizedLabel,
      normalizedTheme: data.normalizedTheme,
      normalizedPlatform: data.normalizedPlatform,
      normalizedConfig: data.normalizedConfig,
    },
  }

  try {
    return await db.missingSuggestion.upsert({
      where,
      update: {
        label: data.label,
        themeName: data.themeName,
        platformName: data.platformName,
        configName: data.configName,
        themeId: data.themeId,
        platformId: data.platformId,
      },
      create: data,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.missingSuggestion.findUniqueOrThrow({ where })
    }

    throw error
  }
}

export const upsertMissingSuggestionVote = createServerAction()
  .input(missingSuggestionSchema)
  .handler(async ({ input }) => {
    const ip = await getIP()

    if (await isRateLimited(`missing-suggestion-vote:${ip}`, "missingSuggestionVote")) {
      throw new Error("Too many votes. Please try again later.")
    }

    const visitorKeyHash = await getVisitorKeyHash()
    const suggestion = await findOrCreateMissingSuggestion(input)

    try {
      await db.missingSuggestionVote.create({
        data: {
          visitorKeyHash,
          missingSuggestion: { connect: { id: suggestion.id } },
        },
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error
      }
    }

    const count = await db.missingSuggestionVote.count({
      where: { missingSuggestionId: suggestion.id },
    })

    revalidatePath("/search")
    return { id: suggestion.id, count }
  })

export const submitMissingSuggestionLink = createServerAction()
  .input(missingSuggestionLinkSchema)
  .handler(async ({ input }) => {
    const ip = await getIP()

    if (await isRateLimited(`missing-suggestion-link:${ip}`, "missingSuggestionLink")) {
      throw new Error("Too many links. Please try again later.")
    }

    const visitorKeyHash = await getVisitorKeyHash()
    const suggestion = await findOrCreateMissingSuggestion(input)
    const linkCount = await db.missingSuggestionLink.count({
      where: { missingSuggestionId: suggestion.id, visitorKeyHash },
    })

    if (linkCount >= 3) {
      throw new Error("Too many links for this suggestion.")
    }

    await db.missingSuggestionLink.create({
      data: {
        url: input.url,
        visitorKeyHash,
        missingSuggestion: { connect: { id: suggestion.id } },
      },
    })

    revalidatePath("/search")
    revalidatePath("/admin/missing-suggestions")
    return { id: suggestion.id }
  })
