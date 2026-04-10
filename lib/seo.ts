import type { Metadata } from "next"
import { config } from "~/config"

export type SeoFaq = {
  question: string
  answer: string
}

export type ThemePlatformSeoOverride = {
  platformSlug: string
  seoTitle?: string
  seoDescription?: string
  seoIntro?: string
  seoFaqs?: SeoFaq[]
  notes?: string
  indexOverride?: "index" | "noindex"
}

type EntityWithSeo = {
  name: string
  slug: string
  description?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoIntro?: string | null
  seoFaqs?: string | null
  searchAliases?: string | null
}

type CombinationMetadataInput = {
  theme: EntityWithSeo & { seoPlatformOverrides?: string | null }
  platform: EntityWithSeo
  hasPorts: boolean
  portCount: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const toNonEmptyString = (value: unknown) => {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const normalizeFaq = (value: unknown): SeoFaq | null => {
  if (!isRecord(value)) return null

  const question = toNonEmptyString(value.question)
  const answer = toNonEmptyString(value.answer)

  if (!question || !answer) return null

  return { question, answer }
}

export const parseSeoFaqs = (value?: string | null): SeoFaq[] => {
  if (!value?.trim()) return []

  try {
    const parsed = JSON.parse(value)

    if (!Array.isArray(parsed)) return []

    return parsed.map(normalizeFaq).filter((faq): faq is SeoFaq => Boolean(faq))
  } catch {
    return []
  }
}

export const parseSearchAliases = (value?: string | null) =>
  (value ?? "")
    .split(/[,\n]/)
    .map(alias => alias.trim())
    .filter(Boolean)

export const parseThemePlatformOverrides = (value?: string | null): ThemePlatformSeoOverride[] => {
  if (!value?.trim()) return []

  try {
    const parsed = JSON.parse(value)

    if (!Array.isArray(parsed)) return []

    return parsed
      .map<ThemePlatformSeoOverride | null>(entry => {
        if (!isRecord(entry)) return null

        const platformSlug = toNonEmptyString(entry.platformSlug)

        if (!platformSlug) return null

        const seoFaqs = Array.isArray(entry.seoFaqs)
          ? entry.seoFaqs.map(normalizeFaq).filter((faq): faq is SeoFaq => Boolean(faq))
          : []

        return {
          platformSlug,
          seoTitle: toNonEmptyString(entry.seoTitle) ?? undefined,
          seoDescription: toNonEmptyString(entry.seoDescription) ?? undefined,
          seoIntro: toNonEmptyString(entry.seoIntro) ?? undefined,
          seoFaqs,
          notes: toNonEmptyString(entry.notes) ?? undefined,
          indexOverride:
            entry.indexOverride === "noindex" || entry.indexOverride === "index"
              ? entry.indexOverride
              : undefined,
        }
      })
      .filter((entry): entry is ThemePlatformSeoOverride => entry !== null)
  } catch {
    return []
  }
}

export const findThemePlatformOverride = (value: string | null | undefined, platformSlug: string) =>
  parseThemePlatformOverrides(value).find(entry => entry.platformSlug === platformSlug) ?? null

export const buildRobots = ({
  index = true,
  follow = true,
}: {
  index?: boolean
  follow?: boolean
}): Metadata["robots"] => ({
  index,
  follow,
  googleBot: {
    index,
    follow,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
})

export const hasSeoQueryState = (searchParams: Record<string, string | string[] | undefined>) =>
  ["page", "q", "sort", "tab", "themeQuery", "platformQuery"].some(key => {
    const value = searchParams[key]
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  })

export const mergeFaqs = (...faqGroups: SeoFaq[][]) => {
  const seen = new Set<string>()
  const merged: SeoFaq[] = []

  for (const group of faqGroups) {
    for (const faq of group) {
      const key = faq.question.toLowerCase()

      if (seen.has(key)) continue

      seen.add(key)
      merged.push(faq)
    }
  }

  return merged
}

export const buildCombinationMetadata = ({
  theme,
  platform,
  hasPorts,
  portCount,
}: CombinationMetadataInput) => {
  const override = findThemePlatformOverride(theme.seoPlatformOverrides, platform.slug)
  const title =
    override?.seoTitle ??
    (hasPorts
      ? `${theme.name} for ${platform.name}: Theme Ports, Screenshots, Install Notes | ${config.site.name}`
      : `${theme.name} for ${platform.name}: Port Status, Alternatives, and Request Page | ${config.site.name}`)

  const description =
    override?.seoDescription ??
    (hasPorts
      ? `Explore ${portCount} ${theme.name} port${portCount === 1 ? "" : "s"} for ${platform.name}, including screenshots, install notes, and official links.`
      : `Check the current status of ${theme.name} for ${platform.name}, browse alternatives, and request or submit a port on ${config.site.name}.`)

  const intro =
    override?.seoIntro ??
    theme.seoIntro ??
    platform.seoIntro ??
    (hasPorts
      ? `${theme.name} is available on ${platform.name}. Compare published ports, verify maintainers, and find the best fit for your setup.`
      : `${theme.name} and ${platform.name} both exist on ${config.site.name}, but there is no published port for this combination yet.`)

  const faqs = mergeFaqs(
    override?.seoFaqs ?? [],
    parseSeoFaqs(theme.seoFaqs),
    parseSeoFaqs(platform.seoFaqs),
  )

  const aliases = Array.from(
    new Set([
      ...parseSearchAliases(theme.searchAliases),
      ...parseSearchAliases(platform.searchAliases),
    ]),
  )

  return {
    title,
    description,
    intro,
    faqs,
    aliases,
    notes: override?.notes ?? null,
    shouldIndex: override?.indexOverride === "noindex" ? false : true,
  }
}

export const buildCombinationFaqs = ({
  themeName,
  platformName,
  hasPorts,
  portCount,
  alternateThemeName,
}: {
  themeName: string
  platformName: string
  hasPorts: boolean
  portCount: number
  alternateThemeName?: string
}) => {
  const availabilityAnswer = hasPorts
    ? `Yes. ${config.site.name} currently lists ${portCount} published ${themeName} port${portCount === 1 ? "" : "s"} for ${platformName}.`
    : `Not yet. ${config.site.name} does not currently list a published ${themeName} port for ${platformName}.`

  return [
    {
      question: `Is there a ${themeName} port for ${platformName}?`,
      answer: availabilityAnswer,
    },
    {
      question: `How can I request ${themeName} for ${platformName}?`,
      answer: `Use the submission flow on ${config.site.name} to publish or suggest an exact ${themeName} for ${platformName} combination.`,
    },
    {
      question: `What can I use meanwhile on ${platformName}?`,
      answer: alternateThemeName
        ? `Browse other published ${platformName} themes like ${alternateThemeName} while you wait for a ${themeName} port.`
        : `Browse other published ${platformName} themes on ${config.site.name} while you wait for a ${themeName} port.`,
    },
  ]
}

export const buildFaqJsonLd = (faqs: SeoFaq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
})

export const buildItemListJsonLd = ({
  name,
  items,
}: {
  name: string
  items: Array<{ name: string; url: string }>
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name,
  url: `${config.site.url}${items[0]?.url ? "" : ""}`,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${config.site.url}${item.url}`,
      name: item.name,
    })),
  },
})

export const buildKeywords = (...groups: string[][]) =>
  Array.from(
    new Set(
      groups
        .flat()
        .map(keyword => keyword.trim())
        .filter(Boolean),
    ),
  )
