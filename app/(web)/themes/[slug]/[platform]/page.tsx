import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header"
import { PortList, PortListSkeleton } from "~/components/catalogue/port-list"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { H4 } from "~/components/common/heading"
import { Link } from "~/components/common/link"
import { Note } from "~/components/common/note"
import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { ExternalLink } from "~/components/web/external-link"
import { Markdown } from "~/components/web/markdown"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Section } from "~/components/web/ui/section"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import {
  buildCombinationFaqs,
  buildCombinationMetadata,
  buildFaqJsonLd,
  buildKeywords,
  buildRobots,
  hasSeoQueryState,
  mergeFaqs,
} from "~/lib/seo"
import { findPlatform } from "~/server/web/platforms/queries"
import { findPorts, findPortsByThemeAndPlatform } from "~/server/web/ports/queries"
import { findTheme } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ slug: string; platform: string }>
  searchParams: Promise<SearchParams>
}

const portSortOptions = [
  { value: "default", label: "Best match" },
  { value: "score.desc", label: "Top rated" },
  { value: "likes.desc", label: "Most liked" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "name.asc", label: "Name A-Z" },
]

const dedupeLinks = (items: Array<{ href: string; label: string; description?: string }>) => {
  const seen = new Set<string>()

  return items.filter(item => {
    if (seen.has(item.href)) return false

    seen.add(item.href)
    return true
  })
}

const getPageData = async ({
  themeSlug,
  platformSlug,
  q,
  sort,
}: {
  themeSlug: string
  platformSlug: string
  q: string
  sort: string
}) => {
  const [theme, platform] = await Promise.all([
    findTheme({ where: { slug: themeSlug } }),
    findPlatform({ where: { slug: platformSlug } }),
  ])

  if (!theme || !platform) return null

  const [filteredPorts, publishedPorts, themePortsElsewhere, platformAlternatives] =
    await Promise.all([
      findPortsByThemeAndPlatform(themeSlug, platformSlug, { q, sort }),
      findPorts({
        where: {
          themeId: theme.id,
          platformId: platform.id,
        },
        take: 100,
        orderBy: [{ isFeatured: "desc" }, { score: "desc" }, { updatedAt: "desc" }],
      }),
      findPorts({
        where: {
          themeId: theme.id,
          platformId: { not: platform.id },
        },
        take: 6,
        orderBy: [{ isFeatured: "desc" }, { score: "desc" }, { updatedAt: "desc" }],
      }),
      findPorts({
        where: {
          platformId: platform.id,
          themeId: { not: theme.id },
        },
        take: 6,
        orderBy: [{ isFeatured: "desc" }, { score: "desc" }, { updatedAt: "desc" }],
      }),
    ])

  return { theme, platform, filteredPorts, publishedPorts, themePortsElsewhere, platformAlternatives }
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { slug, platform } = await props.params
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")
  const data = await getPageData({ themeSlug: slug, platformSlug: platform, q, sort })
  const url = `/themes/${slug}/${platform}`

  if (!data) return { title: "Theme Combination Not Found" }

  const seo = buildCombinationMetadata({
    theme: data.theme,
    platform: data.platform,
    hasPorts: data.publishedPorts.length > 0,
    portCount: data.publishedPorts.length,
  })

  return {
    title: seo.title,
    description: seo.description,
    keywords: buildKeywords(seo.aliases, [
      `${data.theme.name} for ${data.platform.name}`,
      `${data.theme.name.toLowerCase()} ${data.platform.name.toLowerCase()}`,
      `${data.platform.name} ${data.theme.name} theme`,
    ]),
    robots: buildRobots({
      index: seo.shouldIndex && !hasSeoQueryState(search),
      follow: true,
    }),
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: {
      ...metadataConfig.openGraph,
      url,
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function ThemePlatformPage(props: PageProps) {
  const { slug, platform } = await props.params
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")
  const data = await getPageData({ themeSlug: slug, platformSlug: platform, q, sort })

  if (!data) notFound()

  const hasPublishedPorts = data.publishedPorts.length > 0
  const seo = buildCombinationMetadata({
    theme: data.theme,
    platform: data.platform,
    hasPorts: hasPublishedPorts,
    portCount: data.publishedPorts.length,
  })
  const faqs = mergeFaqs(
    seo.faqs,
    buildCombinationFaqs({
      themeName: data.theme.name,
      platformName: data.platform.name,
      hasPorts: hasPublishedPorts,
      portCount: data.publishedPorts.length,
      alternateThemeName: data.platformAlternatives[0]?.theme.name,
    }),
  )

  const otherThemePortLinks = dedupeLinks(
    data.themePortsElsewhere.map(port => ({
      href: `/themes/${port.theme.slug}/${port.platform.slug}`,
      label: `${port.theme.name} for ${port.platform.name}`,
      description: port.description ?? undefined,
    })),
  )

  const platformAlternativeLinks = dedupeLinks(
    data.platformAlternatives.map(port => ({
      href: `/themes/${port.theme.slug}/${port.platform.slug}`,
      label: `${port.theme.name} for ${port.platform.name}`,
      description: port.description ?? undefined,
    })),
  )

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/themes", name: "Themes" },
          { href: `/themes/${data.theme.slug}`, name: data.theme.name },
          { href: `/themes/${data.theme.slug}/${data.platform.slug}`, name: data.platform.name },
        ]}
      />

      <Section>
        <Section.Content className="md:col-span-3">
          <CatalogueListHeader
            title={`${data.theme.name} for ${data.platform.name}`}
            description={
              hasPublishedPorts
                ? q
                  ? `${data.filteredPorts.length} result${data.filteredPorts.length === 1 ? "" : "s"} for "${q}"`
                  : `${data.publishedPorts.length} port${data.publishedPorts.length === 1 ? "" : "s"} available`
                : `No published ${data.theme.name} port for ${data.platform.name} yet`
            }
          />

          {hasPublishedPorts ? (
            <>
              <CatalogueSearchControls
                query={q}
                sort={sort}
                placeholder={`Search ${data.theme.name} ports for ${data.platform.name}...`}
                sortOptions={portSortOptions}
              />

              {q && data.filteredPorts.length === 0 ? (
                <Note>
                  No published ports matched "{q}". Clear the filter to browse all published{" "}
                  {data.theme.name} ports for {data.platform.name}.
                </Note>
              ) : null}

              <Suspense fallback={<PortListSkeleton count={3} />}>
                <PortList
                  ports={data.filteredPorts}
                  routePrefix="themes"
                  themeSlug={data.theme.slug}
                  platformSlug={data.platform.slug}
                  showListingAd
                  adContext={{ themeId: data.theme.id, platformId: data.platform.id }}
                />
              </Suspense>
            </>
          ) : (
            <div className="flex flex-col gap-6">
              <Note>{seo.description}</Note>

              <Markdown code={seo.intro} />

              <div className="flex flex-wrap gap-3">
                <Button size="md" asChild>
                  <Link href="/submit">Submit a Port</Link>
                </Button>
                <Button size="md" variant="secondary" asChild>
                  <Link href="/suggest?type=Theme">Suggest a Theme</Link>
                </Button>
              </div>

              <Card hover={false} focus={false}>
                <H4 as="h2">Available {data.theme.name} Ports</H4>
                {otherThemePortLinks.length ? (
                  <ul className="flex flex-col gap-3 text-sm text-secondary-foreground">
                    {otherThemePortLinks.map(item => (
                      <li key={item.href}>
                        <Link href={item.href} className="font-medium text-foreground hover:text-primary">
                          {item.label}
                        </Link>
                        {item.description ? <p>{item.description}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Note>No other published {data.theme.name} combinations yet.</Note>
                )}
              </Card>

              <Card hover={false} focus={false}>
                <H4 as="h2">Alternative {data.platform.name} Themes</H4>
                {platformAlternativeLinks.length ? (
                  <ul className="flex flex-col gap-3 text-sm text-secondary-foreground">
                    {platformAlternativeLinks.map(item => (
                      <li key={item.href}>
                        <Link href={item.href} className="font-medium text-foreground hover:text-primary">
                          {item.label}
                        </Link>
                        {item.description ? <p>{item.description}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Note>No alternative published {data.platform.name} themes yet.</Note>
                )}
              </Card>

              {faqs.length ? (
                <Card hover={false} focus={false}>
                  <H4 as="h2">FAQ</H4>
                  <div className="flex flex-col gap-4">
                    {faqs.map(faq => (
                      <div key={faq.question}>
                        <h3 className="font-medium text-foreground">{faq.question}</h3>
                        <p className="text-sm text-secondary-foreground">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </Section.Content>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            hasPublishedPorts
              ? {
                  "@context": "https://schema.org",
                  "@type": "CollectionPage",
                  name: `${data.theme.name} for ${data.platform.name}`,
                  description: seo.description,
                  url: `${config.site.url}/themes/${data.theme.slug}/${data.platform.slug}`,
                  mainEntity: {
                    "@type": "ItemList",
                    itemListElement: data.publishedPorts.map((port, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      url: `${config.site.url}/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`,
                      name: port.name ?? `${port.theme.name} for ${port.platform.name}`,
                    })),
                  },
                }
              : {
                  "@context": "https://schema.org",
                  "@type": "WebPage",
                  name: `${data.theme.name} for ${data.platform.name}`,
                  description: seo.description,
                  url: `${config.site.url}/themes/${data.theme.slug}/${data.platform.slug}`,
                },
          ),
        }}
      />
      {faqs.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(faqs)) }}
        />
      ) : null}
    </>
  )
}
