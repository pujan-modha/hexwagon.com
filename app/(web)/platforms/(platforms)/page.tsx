import type { Metadata } from "next"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header"
import { PlatformCard, PlatformCardSkeleton } from "~/components/catalogue/platform-card"
import { CatalogueSearchControls } from "~/components/web/catalogue-search-controls"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"
import { searchPlatforms } from "~/server/web/platforms/queries"

type PageProps = {
  searchParams: Promise<SearchParams>
}

export const metadata: Metadata = {
  title: "Platforms",
  description: "Browse all platforms and their available theme ports.",
  openGraph: { ...metadataConfig.openGraph, url: "/platforms" },
  alternates: { ...metadataConfig.alternates, canonical: "/platforms" },
}

const PLATFORMS_PER_PAGE = 35

const platformSortOptions = [
  { value: "default", label: "Best match" },
  { value: "pageviews.desc", label: "Most viewed" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "createdAt.desc", label: "Newest" },
]

export default async function PlatformsPage(props: PageProps) {
  const search = await props.searchParams
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "")
  const sort = Array.isArray(search.sort)
    ? (search.sort[0] ?? "default")
    : (search.sort ?? "default")
  const page = Number(search.page) || 1

  const { platforms, totalCount } = await searchPlatforms(
    {
      q,
      page,
      perPage: PLATFORMS_PER_PAGE,
      sort,
      theme: [],
      platform: [],
      tag: [],
    },
    q ? undefined : { isFeatured: true },
  )

  return (
    <>
      <Breadcrumbs items={[{ href: "/platforms", name: "Platforms" }]} />

      <Intro>
        <IntroTitle>Browse Platforms</IntroTitle>
        <IntroDescription>
          {q
            ? `Found ${totalCount} platform${totalCount !== 1 ? "s" : ""} matching "${q}"`
            : "Discover all platforms and their available theme ports."}
        </IntroDescription>
      </Intro>

      <CatalogueSearchControls
        query={q}
        sort={sort}
        placeholder="Search platforms..."
        sortOptions={platformSortOptions}
      />

      {/* <CatalogueListHeader title="All Platforms" count={totalCount} /> */}

      <Suspense
        fallback={
          <CatalogueGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <PlatformCardSkeleton key={i} />
            ))}
          </CatalogueGrid>
        }
      >
        <CatalogueGrid>
          {platforms.map(platform => (
            <PlatformCard key={platform.id} platform={platform} showCount />
          ))}
        </CatalogueGrid>
      </Suspense>
    </>
  )
}
