import { PortStatus } from "@prisma/client"
import type { Metadata } from "next"
import type { SearchParams } from "nuqs/server"
import type { ReactNode } from "react"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { PlatformCard } from "~/components/catalogue/platform-card"
import { PortCard } from "~/components/catalogue/port-card"
import { ThemeCard } from "~/components/catalogue/theme-card"
import { EntitySearchForm } from "~/components/web/entity-search-form"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"
import { searchPageSortOptions } from "~/lib/search-page"
import { findPlatforms, searchPlatforms } from "~/server/web/platforms/queries"
import { searchPorts } from "~/server/web/ports/queries"
import { findThemes, searchThemes } from "~/server/web/themes/queries"

type PageProps = {
  searchParams: Promise<SearchParams>
}

export const metadata: Metadata = {
  title: "Search",
  description: "Search themes, platforms, and ports from one place.",
  openGraph: { ...metadataConfig.openGraph, url: "/search" },
  alternates: { ...metadataConfig.alternates, canonical: "/search" },
}

const THEME_RESULTS_LIMIT = 6
const PLATFORM_RESULTS_LIMIT = 6
const PORT_RESULTS_LIMIT = 12

const readParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "")

const normalize = (value: string) => value.trim()

const buildPortTextQuery = ({
  themeQuery,
  platformQuery,
  selectedThemeName,
  selectedPlatformName,
}: {
  themeQuery: string
  platformQuery: string
  selectedThemeName?: string
  selectedPlatformName?: string
}) => {
  const parts = [themeQuery, platformQuery]
    .map(normalize)
    .filter(Boolean)
    .filter(value => {
      const lowerValue = value.toLowerCase()

      if (selectedThemeName && lowerValue === selectedThemeName.toLowerCase()) {
        return false
      }

      if (selectedPlatformName && lowerValue === selectedPlatformName.toLowerCase()) {
        return false
      }

      return true
    })

  return parts.join(" ").trim()
}

export default async function SearchPage(props: PageProps) {
  const search = await props.searchParams
  const themeQuery = normalize(readParam(search.themeQuery))
  const platformQuery = normalize(readParam(search.platformQuery))
  const selectedThemeSlug = normalize(readParam(search.theme))
  const selectedPlatformSlug = normalize(readParam(search.platform))
  const requestedSort = normalize(readParam(search.sort)) || "default"
  const sort = searchPageSortOptions.some(option => option.value === requestedSort)
    ? requestedSort
    : "default"

  const [selectedTheme, selectedPlatform] = await Promise.all([
    selectedThemeSlug
      ? findThemes({
          where: { slug: selectedThemeSlug },
          take: 1,
        }).then(themes => themes[0] ?? null)
      : Promise.resolve(null),
    selectedPlatformSlug
      ? findPlatforms({
          where: { slug: selectedPlatformSlug },
          take: 1,
        }).then(platforms => platforms[0] ?? null)
      : Promise.resolve(null),
  ])

  const hasCriteria = Boolean(
    themeQuery || platformQuery || selectedTheme?.slug || selectedPlatform?.slug,
  )

  const themeWhere = selectedPlatform?.slug
    ? {
        ports: {
          some: {
            status: PortStatus.Published,
            platform: { slug: selectedPlatform.slug },
          },
        },
      }
    : undefined

  const platformWhere = selectedTheme?.slug
    ? {
        ports: {
          some: {
            status: PortStatus.Published,
            theme: { slug: selectedTheme.slug },
          },
        },
      }
    : undefined

  const portTextQuery = buildPortTextQuery({
    themeQuery,
    platformQuery,
    selectedThemeName: selectedTheme?.name,
    selectedPlatformName: selectedPlatform?.name,
  })

  const [themeResults, platformResults, portResults] = await Promise.all([
    selectedTheme
      ? Promise.resolve({
          themes: [selectedTheme],
          totalCount: 1,
        })
      : hasCriteria
        ? searchThemes(
            {
              q: themeQuery,
              page: 1,
              perPage: THEME_RESULTS_LIMIT,
              sort,
              theme: [],
              platform: [],
              tag: [],
            },
            themeWhere,
          )
        : Promise.resolve({ themes: [], totalCount: 0 }),
    selectedPlatform
      ? Promise.resolve({
          platforms: [selectedPlatform],
          totalCount: 1,
        })
      : hasCriteria
        ? searchPlatforms(
            {
              q: platformQuery,
              page: 1,
              perPage: PLATFORM_RESULTS_LIMIT,
              sort,
              theme: [],
              platform: [],
              tag: [],
            },
            platformWhere,
          )
        : Promise.resolve({ platforms: [], totalCount: 0 }),
    hasCriteria
      ? searchPorts({
          q: portTextQuery,
          page: 1,
          perPage: PORT_RESULTS_LIMIT,
          sort,
          theme: selectedTheme?.slug ? [selectedTheme.slug] : [],
          platform: selectedPlatform?.slug ? [selectedPlatform.slug] : [],
          tag: [],
        })
      : Promise.resolve({ ports: [], totalCount: 0 }),
  ])

  const resultCount = themeResults.totalCount + platformResults.totalCount + portResults.totalCount

  return (
    <>
      <Breadcrumbs items={[{ href: "/search", name: "Search" }]} />

      <Intro>
        <IntroTitle>Search Themes, Platforms, and Ports</IntroTitle>
        <IntroDescription>
          {hasCriteria
            ? `Found ${resultCount.toLocaleString()} relevant result${resultCount === 1 ? "" : "s"} across themes, platforms, and ports.`
            : "Choose a theme, platform, or both to explore relevant themes, platforms, and ports from one results page."}
        </IntroDescription>
      </Intro>

      <EntitySearchForm
        variant="page"
        initialThemeQuery={themeQuery}
        initialPlatformQuery={platformQuery}
        initialThemeSelection={
          selectedTheme
            ? {
                slug: selectedTheme.slug,
                name: selectedTheme.name,
                faviconUrl: selectedTheme.faviconUrl ?? undefined,
                isVerified: selectedTheme._count.maintainers > 0,
              }
            : null
        }
        initialPlatformSelection={
          selectedPlatform
            ? {
                slug: selectedPlatform.slug,
                name: selectedPlatform.name,
                faviconUrl: selectedPlatform.faviconUrl ?? undefined,
                isVerified: selectedPlatform.isFeatured,
              }
            : null
        }
        initialSort={sort}
      />

      {!hasCriteria ? (
        <EmptySearchState />
      ) : (
        <div className="flex flex-col gap-12">
          <SearchResultSection
            title="Themes"
            description={
              selectedPlatform
                ? `Themes relevant to ${selectedPlatform.name}.`
                : "Matching themes from your search."
            }
            count={themeResults.totalCount}
          >
            {themeResults.themes.length ? (
              <CatalogueGrid>
                {themeResults.themes.map(theme => (
                  <ThemeCard key={theme.id} theme={theme} showCount />
                ))}
              </CatalogueGrid>
            ) : (
              <EmptySectionMessage message="No themes match this search yet." />
            )}
          </SearchResultSection>

          <SearchResultSection
            title="Platforms"
            description={
              selectedTheme
                ? `Platforms relevant to ${selectedTheme.name}.`
                : "Matching platforms from your search."
            }
            count={platformResults.totalCount}
          >
            {platformResults.platforms.length ? (
              <CatalogueGrid>
                {platformResults.platforms.map(platform => (
                  <PlatformCard key={platform.id} platform={platform} showCount />
                ))}
              </CatalogueGrid>
            ) : (
              <EmptySectionMessage message="No platforms match this search yet." />
            )}
          </SearchResultSection>

          <SearchResultSection
            title="Ports"
            description="Ports filtered by your selected theme/platform and any remaining text query."
            count={portResults.totalCount}
          >
            {portResults.ports.length ? (
              <CatalogueGrid className="xl:grid-cols-3">
                {portResults.ports.map(port => (
                  <PortCard key={port.id} port={port} />
                ))}
              </CatalogueGrid>
            ) : (
              <EmptySectionMessage message="No ports match this search yet." />
            )}
          </SearchResultSection>
        </div>
      )}
    </>
  )
}

const SearchResultSection = ({
  title,
  description,
  count,
  children,
}: {
  title: string
  description: string
  count: number
  children: ReactNode
}) => {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {count.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

const EmptySectionMessage = ({ message }: { message: string }) => {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

const EmptySearchState = () => {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Start with a theme, a platform, or both
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
        Pick a suggested theme or platform to lock it in as a filter, or leave the fields as plain
        text and search broadly across themes, platforms, and ports.
      </p>
    </div>
  )
}
