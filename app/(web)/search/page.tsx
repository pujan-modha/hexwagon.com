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
import { buildRobots } from "~/lib/seo"
import { searchPageSortOptions } from "~/lib/search-page"
import { findPlatforms, searchPlatforms } from "~/server/web/platforms/queries"
import { searchPorts } from "~/server/web/ports/queries"
import { findThemes, searchThemes } from "~/server/web/themes/queries"

type PageProps = {
  searchParams: Promise<SearchParams>
}

export const metadata: Metadata = {
  title: "Search Themes and Platforms",
  description: "Search themes, platforms, and ports from one place.",
  openGraph: { ...metadataConfig.openGraph, url: "/search" },
  alternates: { ...metadataConfig.alternates, canonical: "/search" },
  robots: buildRobots({ index: false, follow: true }),
}

const THEME_RESULTS_LIMIT = 6
const PLATFORM_RESULTS_LIMIT = 6
const PORT_RESULTS_LIMIT = 12
const SECONDARY_PREVIEW_LIMIT = 3

const SEARCH_SECTION_IDS = {
  ports: "search-ports",
  themes: "search-themes",
  platforms: "search-platforms",
} as const

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
  const genericQuery = normalize(readParam(search.q))
  const themeQuery = normalize(readParam(search.themeQuery)) || genericQuery
  const platformQuery = normalize(readParam(search.platformQuery)) || genericQuery
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
    genericQuery || themeQuery || platformQuery || selectedTheme?.slug || selectedPlatform?.slug,
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
    themeQuery: genericQuery || themeQuery,
    platformQuery: genericQuery || platformQuery,
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
  const visibleThemePreview = themeResults.themes.slice(0, SECONDARY_PREVIEW_LIMIT)
  const hiddenThemeResults = themeResults.themes.slice(SECONDARY_PREVIEW_LIMIT)
  const visiblePlatformPreview = platformResults.platforms.slice(0, SECONDARY_PREVIEW_LIMIT)
  const hiddenPlatformResults = platformResults.platforms.slice(SECONDARY_PREVIEW_LIMIT)

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
        initialPlatformQuery={platformQuery === themeQuery && genericQuery ? "" : platformQuery}
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
          <SearchResultJumpNav
            portsCount={portResults.totalCount}
            themesCount={themeResults.totalCount}
            platformsCount={platformResults.totalCount}
          />

          <SearchResultSection
            id={SEARCH_SECTION_IDS.ports}
            title="Ports"
            description="Ports filtered by your selected theme/platform and any remaining text query."
            count={portResults.totalCount}
            visibleCount={portResults.ports.length}
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

          <SearchResultSection
            id={SEARCH_SECTION_IDS.themes}
            title="Themes"
            description={
              selectedPlatform
                ? `Themes relevant to ${selectedPlatform.name}.`
                : "Matching themes from your search."
            }
            count={themeResults.totalCount}
            visibleCount={themeResults.themes.length}
          >
            {themeResults.themes.length ? (
              <div className="flex flex-col gap-4">
                <CatalogueGrid>
                  {visibleThemePreview.map(theme => (
                    <ThemeCard key={theme.id} theme={theme} showCount />
                  ))}
                </CatalogueGrid>

                {hiddenThemeResults.length ? (
                  <details className="rounded-2xl border border-border bg-muted/10 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      Show {hiddenThemeResults.length.toLocaleString()} more theme
                      {hiddenThemeResults.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-4">
                      <CatalogueGrid>
                        {hiddenThemeResults.map(theme => (
                          <ThemeCard key={theme.id} theme={theme} showCount />
                        ))}
                      </CatalogueGrid>
                    </div>
                  </details>
                ) : null}
              </div>
            ) : (
              <EmptySectionMessage message="No themes match this search yet." />
            )}
          </SearchResultSection>

          <SearchResultSection
            id={SEARCH_SECTION_IDS.platforms}
            title="Platforms"
            description={
              selectedTheme
                ? `Platforms relevant to ${selectedTheme.name}.`
                : "Matching platforms from your search."
            }
            count={platformResults.totalCount}
            visibleCount={platformResults.platforms.length}
          >
            {platformResults.platforms.length ? (
              <div className="flex flex-col gap-4">
                <CatalogueGrid>
                  {visiblePlatformPreview.map(platform => (
                    <PlatformCard key={platform.id} platform={platform} showCount />
                  ))}
                </CatalogueGrid>

                {hiddenPlatformResults.length ? (
                  <details className="rounded-2xl border border-border bg-muted/10 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      Show {hiddenPlatformResults.length.toLocaleString()} more platform
                      {hiddenPlatformResults.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-4">
                      <CatalogueGrid>
                        {hiddenPlatformResults.map(platform => (
                          <PlatformCard key={platform.id} platform={platform} showCount />
                        ))}
                      </CatalogueGrid>
                    </div>
                  </details>
                ) : null}
              </div>
            ) : (
              <EmptySectionMessage message="No platforms match this search yet." />
            )}
          </SearchResultSection>
        </div>
      )}
    </>
  )
}

const SearchResultJumpNav = ({
  portsCount,
  themesCount,
  platformsCount,
}: {
  portsCount: number
  themesCount: number
  platformsCount: number
}) => {
  const navItems = [
    { href: `#${SEARCH_SECTION_IDS.ports}`, label: "Ports", count: portsCount },
    { href: `#${SEARCH_SECTION_IDS.themes}`, label: "Themes", count: themesCount },
    { href: `#${SEARCH_SECTION_IDS.platforms}`, label: "Platforms", count: platformsCount },
  ]

  return (
    <nav
      className="sticky top-16 z-20 -mt-4 rounded-xl border border-border bg-background/95 p-2 backdrop-blur"
      aria-label="Jump to result type"
    >
      <div className="flex flex-wrap items-center gap-2">
        {navItems.map(item => (
          <a
            key={item.label}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/60"
          >
            <span>{item.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {item.count.toLocaleString()}
            </span>
          </a>
        ))}
      </div>
    </nav>
  )
}

const SearchResultSection = ({
  id,
  title,
  description,
  count,
  visibleCount,
  children,
}: {
  id: string
  title: string
  description: string
  count: number
  visibleCount: number
  children: ReactNode
}) => {
  const isTruncated = count > visibleCount

  return (
    <section id={id} className="scroll-mt-28 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {count.toLocaleString()}
          </span>

          {isTruncated ? (
            <span className="text-xs text-muted-foreground">
              Showing {visibleCount.toLocaleString()} of {count.toLocaleString()}
            </span>
          ) : null}
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
