import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header"
import { PortList, PortListSkeleton } from "~/components/catalogue/port-list"
import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Section } from "~/components/web/ui/section"
import { metadataConfig } from "~/config/metadata"
import { buildRobots } from "~/lib/seo"
import { findPlatform } from "~/server/web/platforms/queries"
import { findPortsByThemeAndPlatform } from "~/server/web/ports/queries"
import { findThemePlatformRouteParams } from "~/server/web/ports/queries"
import { findTheme } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ slug: string; theme: string }>
  searchParams: Promise<SearchParams>
}

const portSortOptions = [
  { value: "default", label: "Best match" },
  { value: "score.desc", label: "Top rated" },
  { value: "likes.desc", label: "Most liked" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "name.asc", label: "Name A-Z" },
]

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { slug, theme } = await props.params
  const [platform, themeEntity] = await Promise.all([
    findPlatform({ where: { slug } }),
    findTheme({ where: { slug: theme } }),
  ])
  const url = `/themes/${theme}/${slug}`

  return {
    title: `${themeEntity?.name ?? theme} for ${platform?.name ?? slug}`,
    description: `Duplicate access path for ${themeEntity?.name ?? theme} on ${platform?.name ?? slug}.`,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { ...metadataConfig.openGraph, url },
    robots: buildRobots({ index: false, follow: true }),
  }
}

export const generateStaticParams = async () => {
  const params = await findThemePlatformRouteParams()
  return params.map(({ themeSlug, platformSlug }) => ({
    slug: platformSlug,
    theme: themeSlug,
  }))
}

export default async function PlatformThemePage(props: PageProps) {
  const { slug, theme } = await props.params
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")

  const [platform, themeEntity] = await Promise.all([
    findPlatform({ where: { slug } }),
    findTheme({ where: { slug: theme } }),
  ])

  if (!platform || !themeEntity) {
    notFound()
  }

  const ports = await findPortsByThemeAndPlatform(theme, slug, { q, sort })

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/platforms", name: "Platforms" },
          { href: `/platforms/${platform.slug}`, name: platform.name },
          {
            href: `/platforms/${platform.slug}/${themeEntity.slug}`,
            name: themeEntity.name,
          },
        ]}
      />

      <Section>
        <Section.Content className="md:col-span-3">
          <CatalogueListHeader
            title={`${themeEntity.name} for ${platform.name}`}
            description={
              q
                ? `${ports.length} result${ports.length !== 1 ? "s" : ""} for "${q}"`
                : `${ports.length} port${ports.length !== 1 ? "s" : ""} available`
            }
          />

          <CatalogueSearchControls
            query={q}
            sort={sort}
            placeholder={`Search ${themeEntity.name} ports for ${platform.name}...`}
            sortOptions={portSortOptions}
          />

          <Suspense fallback={<PortListSkeleton count={3} />}>
            <PortList
              ports={ports}
              routePrefix="platforms"
              themeSlug={themeEntity.slug}
              platformSlug={platform.slug}
              showListingAd
              adContext={{ themeId: themeEntity.id, platformId: platform.id }}
            />
          </Suspense>
        </Section.Content>
      </Section>
    </>
  )
}
