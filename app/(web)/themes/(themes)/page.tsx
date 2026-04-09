import type { Metadata } from "next"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header"
import { ThemeCard, ThemeCardSkeleton } from "~/components/catalogue/theme-card"
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card"
import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"
import { searchThemes } from "~/server/web/themes/queries"

type PageProps = {
  searchParams: Promise<SearchParams>
}

export const metadata: Metadata = {
  title: "Theme Ports",
  description: "Browse all color themes and their ports across platforms.",
  openGraph: { ...metadataConfig.openGraph, url: "/themes" },
  alternates: { ...metadataConfig.alternates, canonical: "/themes" },
}

const THEMES_PER_PAGE = 35

const themeSortOptions = [
  { value: "default", label: "Best match" },
  { value: "likes.desc", label: "Most liked" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
]

export default async function ThemesPage(props: PageProps) {
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")
  const page = Number(search.page) || 1

  const { themes, totalCount } = await searchThemes(
    {
      q,
      page,
      perPage: THEMES_PER_PAGE,
      sort,
      theme: [],
      platform: [],
      tag: [],
    },
    q ? undefined : { isFeatured: true },
  )

  return (
    <>
      <Breadcrumbs items={[{ href: "/themes", name: "Themes" }]} />

      <Intro>
        <IntroTitle>Browse Themes</IntroTitle>
        <IntroDescription>
          {q
            ? `Found ${totalCount} theme${totalCount !== 1 ? "s" : ""} matching "${q}"`
            : "Discover color themes and their ports across all platforms."}
        </IntroDescription>
      </Intro>

      <CatalogueSearchControls
        query={q}
        sort={sort}
        placeholder="Search themes..."
        sortOptions={themeSortOptions}
      />

      {/* <CatalogueListHeader title="All Themes" count={totalCount} /> */}

      <Suspense
        fallback={
          <CatalogueGrid>
            {Array.from({ length: 8 }).flatMap((_, i) => {
              const cards = [<ThemeCardSkeleton key={`theme-skeleton-${i}`} />]

              if (i === 1) {
                cards.push(<AdCardSkeleton key="themes-listing-ad-skeleton" />)
              }

              return cards
            })}
          </CatalogueGrid>
        }
      >
        <CatalogueGrid>
          {themes.flatMap((theme, index) => {
            const cards = [<ThemeCard key={theme.id} theme={theme} showCount />]

            if (index === 1) {
              cards.push(<AdCard key="themes-listing-ad" slot="Listing" />)
            }

            return cards
          })}
          {themes.length === 1 ? <AdCard slot="Listing" /> : null}
        </CatalogueGrid>
      </Suspense>
    </>
  )
}
