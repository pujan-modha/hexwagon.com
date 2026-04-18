import type { Metadata } from "next"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { ConfigCard, ConfigCardSkeleton } from "~/components/catalogue/config-card"
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card"
import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"
import { buildItemListJsonLd, buildRobots, hasSeoQueryState } from "~/lib/seo"
import { searchConfigs } from "~/server/web/configs/queries"

type PageProps = {
  searchParams: Promise<SearchParams>
}

export const generateMetadata = async ({ searchParams }: PageProps): Promise<Metadata> => ({
  title: "Configs and Dotfiles Directory",
  description:
    "Browse configs and dotfiles for editors, terminals, and workflows, tagged to themes and platforms.",
  openGraph: { ...metadataConfig.openGraph, url: "/configs" },
  alternates: { ...metadataConfig.alternates, canonical: "/configs" },
  robots: buildRobots({ index: !hasSeoQueryState(await searchParams), follow: true }),
})

const CONFIGS_PER_PAGE = 35

const configSortOptions = [
  { value: "default", label: "Best match" },
  { value: "likes.desc", label: "Most liked" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
]

export default async function ConfigsPage(props: PageProps) {
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")
  const page = Number(search.page) || 1
  const theme = search.theme ? (Array.isArray(search.theme) ? search.theme : [search.theme]) : []
  const platform = search.platform
    ? Array.isArray(search.platform)
      ? search.platform
      : [search.platform]
    : []

  const { configs, totalCount } = await searchConfigs({
    q,
    page,
    perPage: CONFIGS_PER_PAGE,
    sort,
    theme,
    platform,
    tag: [],
  })

  return (
    <>
      <Breadcrumbs items={[{ href: "/configs", name: "Configs" }]} />

      <Intro>
        <IntroTitle>Browse Configs &amp; Dotfiles</IntroTitle>
        <IntroDescription>
          {q
            ? `Found ${totalCount} config${totalCount !== 1 ? "s" : ""} or dotfile match${totalCount === 1 ? "" : "es"} for "${q}"`
            : "Discover configs and dotfiles across themes and platforms."}
        </IntroDescription>
      </Intro>

      <CatalogueSearchControls
        query={q}
        sort={sort}
        placeholder="Search configs and dotfiles..."
        sortOptions={configSortOptions}
      />

      <Suspense
        fallback={
          <CatalogueGrid>
            {Array.from({ length: 8 }).flatMap((_, i) => {
              const cards = [<ConfigCardSkeleton key={`config-skeleton-${i}`} />]

              if (i === 1) {
                cards.push(<AdCardSkeleton key="configs-listing-ad-skeleton" />)
              }

              return cards
            })}
          </CatalogueGrid>
        }
      >
        <CatalogueGrid>
          {configs.flatMap((config, index) => {
            const cards = [<ConfigCard key={config.id} config={config} />]

            if (index === 1) {
              cards.push(<AdCard key="configs-listing-ad" slot="Listing" />)
            }

            return cards
          })}
          {configs.length === 1 ? <AdCard slot="Listing" /> : null}
        </CatalogueGrid>
      </Suspense>

      {configs.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildItemListJsonLd({
                name: "Configs and Dotfiles Directory",
                items: configs.map(config => ({
                  name: config.name,
                  url: `/configs/${config.slug}`,
                })),
              }),
            ),
          }}
        />
      ) : null}
    </>
  )
}
