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
import { findPlatform } from "~/server/web/platforms/queries"
import {
  findPortsByThemeAndPlatform,
  findThemePlatformRouteParams,
} from "~/server/web/ports/queries"
import { findTheme } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ slug: string; platform: string }>
  searchParams: Promise<SearchParams>
}

const portSortOptions = [
  { value: "default", label: "Best match" },
  { value: "score.desc", label: "Top rated" },
  { value: "pageviews.desc", label: "Most viewed" },
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "name.asc", label: "Name A-Z" },
]

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { slug, platform } = await props.params
  const [theme, platformEntity] = await Promise.all([
    findTheme({ where: { slug } }),
    findPlatform({ where: { slug: platform } }),
  ])

  const url = `/themes/${slug}/${platform}`

  return {
    title: `${theme?.name ?? slug} ports for ${platformEntity?.name ?? platform}`,
    description: `Browse ${theme?.name ?? slug} theme ports for ${platformEntity?.name ?? platform}.`,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { ...metadataConfig.openGraph, url },
  }
}

export const generateStaticParams = async () => {
  const params = await findThemePlatformRouteParams()
  return params.map(({ themeSlug, platformSlug }) => ({
    slug: themeSlug,
    platform: platformSlug,
  }))
}

export default async function ThemePlatformPage(props: PageProps) {
  const { slug, platform } = await props.params
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")

  const [theme, platformEntity] = await Promise.all([
    findTheme({ where: { slug } }),
    findPlatform({ where: { slug: platform } }),
  ])

  if (!theme || !platformEntity) {
    notFound()
  }

  const ports = await findPortsByThemeAndPlatform(slug, platform, {
    q,
    sort,
  })

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/themes", name: "Themes" },
          { href: `/themes/${theme.slug}`, name: theme.name },
          {
            href: `/themes/${theme.slug}/${platform}`,
            name: platformEntity.name,
          },
        ]}
      />

      <Section>
        <Section.Content className="md:col-span-3">
          <CatalogueListHeader
            title={`${theme.name} for ${platformEntity.name}`}
            description={
              q
                ? `${ports.length} result${ports.length !== 1 ? "s" : ""} for "${q}"`
                : `${ports.length} port${ports.length !== 1 ? "s" : ""} available`
            }
          />

          <CatalogueSearchControls
            query={q}
            sort={sort}
            placeholder={`Search ${theme.name} ports for ${platformEntity.name}...`}
            sortOptions={portSortOptions}
          />

          <Suspense fallback={<PortListSkeleton count={3} />}>
            <PortList
              ports={ports}
              routePrefix="themes"
              themeSlug={theme.slug}
              platformSlug={platformEntity.slug}
              showListingAd
              adContext={{ themeId: theme.id, platformId: platformEntity.id }}
            />
          </Suspense>
        </Section.Content>
      </Section>
    </>
  )
}
