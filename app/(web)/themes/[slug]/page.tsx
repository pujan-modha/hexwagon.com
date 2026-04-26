import { PortStatus, type Prisma } from "@prisma/client"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { Suspense, cache } from "react"
import { PageViewEvent } from "~/components/analytics/page-view-event"
import { ColorPaletteTab } from "~/components/catalogue/color-palette-tab"
import { EntityHeader } from "~/components/catalogue/entity-header"
import { EntityHeaderActions } from "~/components/catalogue/entity-header-actions"
import { EntityLikeButton } from "~/components/catalogue/entity-like-button"
import { EntityReportButton } from "~/components/catalogue/entity-report-button"
import { EntityTabs } from "~/components/catalogue/entity-tabs"
import { ThemeClaimButton } from "~/components/catalogue/theme-claim-button"
import { ThemeConfigsTab } from "~/components/catalogue/theme-configs-tab"
import { ThemeGuidelinesTab } from "~/components/catalogue/theme-guidelines-tab"
import { ThemePlatformsTab } from "~/components/catalogue/theme-platforms-tab"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card"
import { Section } from "~/components/web/ui/section"
import { VerifiedBadge } from "~/components/web/verified-badge"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import { getServerSessionIfCookie } from "~/lib/auth"
import { buildKeywords, buildRobots, hasSeoQueryState, parseSearchAliases } from "~/lib/seo"
import { findConfigsByTheme } from "~/server/web/configs/queries"
import {
  findFeaturedPlatforms,
  findPlatforms,
  searchPlatforms,
} from "~/server/web/platforms/queries"
import { findTheme } from "~/server/web/themes/queries"
import { findThemeSlugs } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

const getPlatformOrderBy = (sort: string): Prisma.PlatformFindManyArgs["orderBy"] => {
  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [string, Prisma.SortOrder]

    if (sortOrder === "asc" || sortOrder === "desc") {
      if (sortBy === "likes") {
        return { likes: { _count: sortOrder } }
      }

      if (["name", "createdAt", "updatedAt", "order"].includes(sortBy)) {
        return { [sortBy]: sortOrder } as Prisma.PlatformFindManyArgs["orderBy"]
      }
    }
  }

  return [{ likes: { _count: "desc" } }, { order: "asc" }, { name: "asc" }]
}

const getTheme = cache(async ({ params }: PageProps) => {
  const { slug } = await params
  const theme = await findTheme({ where: { slug } })

  if (!theme) {
    notFound()
  }

  return theme
})

export const generateStaticParams = async () => {
  const themes = await findThemeSlugs({})
  return themes.map(theme => ({ slug: theme.slug }))
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const theme = await getTheme(props)
  const search = await props.searchParams
  const url = `/themes/${theme.slug}`

  return {
    title:
      theme.seoTitle ??
      `${theme.name} Theme Ports Across VS Code, Ghostty, and More | ${config.site.name}`,
    description:
      theme.seoDescription ??
      theme.description ??
      `Browse ${theme.name} theme ports across all platforms.`,
    keywords: buildKeywords(parseSearchAliases(theme.searchAliases), [
      theme.name,
      `${theme.name} theme`,
      `${theme.name} ports`,
    ]),
    robots: buildRobots({ index: !hasSeoQueryState(search), follow: true }),
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: {
      ...metadataConfig.openGraph,
      url,
      title: theme.seoTitle ?? theme.name,
      description:
        theme.seoDescription ??
        theme.description ??
        `Browse ${theme.name} theme ports across all platforms.`,
    },
  }
}

export default async function ThemePage(props: PageProps) {
  const [theme, searchParams] = await Promise.all([getTheme(props), props.searchParams])
  const session = await getServerSessionIfCookie()

  const q = Array.isArray(searchParams.q) ? (searchParams.q[0] ?? "") : (searchParams.q ?? "")
  const sort = Array.isArray(searchParams.sort)
    ? (searchParams.sort[0] ?? "default")
    : (searchParams.sort ?? "default")

  const platformsWhere = {
    ports: {
      some: {
        themeId: theme.id,
        status: { in: [PortStatus.Published] },
      },
    },
  } satisfies Prisma.PlatformWhereInput

  const platforms = q
    ? (
        await searchPlatforms(
          {
            q,
            page: 1,
            perPage: 500,
            sort,
            theme: [],
            platform: [],
            tag: [],
          },
          platformsWhere,
        )
      ).platforms
    : await findPlatforms({
        where: platformsWhere,
        orderBy: getPlatformOrderBy(sort),
      })
  const featuredPlatformSuggestions = q
    ? []
    : await findFeaturedPlatforms({
        where: {
          ...platformsWhere,
          id: {
            notIn: platforms.map(platformItem => platformItem.id),
          },
        },
        take: 6,
      })
  const linkedPlatforms = [...platforms, ...featuredPlatformSuggestions].filter(
    (platformItem, index, allPlatforms) =>
      allPlatforms.findIndex(candidate => candidate.id === platformItem.id) === index,
  )
  const configs = await findConfigsByTheme(theme.slug, { q, sort })

  const paletteCount = new Set(theme.colors.map(color => color.paletteName || "Default")).size
  const isMaintainer =
    session?.user.role === "admin" ||
    theme.maintainers.some(maintainer => maintainer.userId === session?.user.id)

  const tabs = [
    {
      value: "platforms",
      label: `Platforms (${theme._count.ports})`,
      content: (
        <Suspense fallback={<div>Loading...</div>}>
          <ThemePlatformsTab
            platforms={linkedPlatforms}
            themeSlug={theme.slug}
            query={q}
            sort={sort}
          />
        </Suspense>
      ),
    },
    {
      value: "configs",
      label: `Configs (${configs.length})`,
      content: <ThemeConfigsTab configs={configs} query={q} sort={sort} />,
    },
    {
      value: "colors",
      label: `Color Palettes (${paletteCount})`,
      content: <ColorPaletteTab colors={theme.colors} />,
    },
    {
      value: "guidelines",
      label: "Guidelines",
      content: <ThemeGuidelinesTab theme={theme} />,
    },
  ]

  return (
    <>
      <PageViewEvent
        event="theme_viewed"
        properties={{ themeId: theme.id, themeSlug: theme.slug }}
      />

      <Breadcrumbs
        items={[
          { href: "/themes", name: "Themes" },
          { href: `/themes/${theme.slug}`, name: theme.name },
        ]}
      />

      <Section>
        <Section.Content>
          <EntityHeader
            name={theme.name}
            description={theme.description}
            logoSrc={theme.faviconUrl}
            badge={
              theme.maintainers.length > 0 ? (
                <VerifiedBadge size="sm" className="-mb-[0.1em]" />
              ) : undefined
            }
            actions={
              <EntityHeaderActions
                primaryAction={
                  isMaintainer ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link href="/dashboard/maintainer">Manage</Link>
                    </Button>
                  ) : theme.maintainers.length === 0 ? (
                    <ThemeClaimButton themeId={theme.id} themeName={theme.name} />
                  ) : undefined
                }
              >
                <EntityLikeButton entityType="theme" entityId={theme.id} grouped />
                <EntityReportButton
                  entityType="theme"
                  entityId={theme.id}
                  entityName={theme.name}
                  grouped
                />
              </EntityHeaderActions>
            }
          />

          <EntityTabs tabs={tabs} defaultTab="platforms" />
        </Section.Content>

        <Section.Sidebar>
          <EntitySidebarCard
            title="Theme Details"
            insights={
              [
                theme.websiteUrl
                  ? {
                      label: "Website",
                      value: theme.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                      link: theme.websiteUrl,
                      eventName: "click_website",
                      eventProps: {
                        entityType: "theme",
                        entityId: theme.id,
                        entitySlug: theme.slug,
                        url: theme.websiteUrl,
                        source: "sidebar_link",
                      },
                      icon: <Icon name="lucide/globe" />,
                    }
                  : undefined,
                {
                  label: "Ports",
                  value: theme._count.ports,
                  icon: <Icon name="lucide/layout-dashboard" />,
                },
              ].filter(Boolean) as any
            }
            buttonHref={theme.websiteUrl ?? undefined}
            buttonLabel={theme.websiteUrl ? "Visit Website" : undefined}
            buttonEventName="click_website"
            buttonEventProps={
              theme.websiteUrl
                ? {
                    entityType: "theme",
                    entityId: theme.id,
                    entitySlug: theme.slug,
                    url: theme.websiteUrl,
                    source: "sidebar_button",
                  }
                : undefined
            }
          />

          <Suspense fallback={<AdCardSkeleton className="min-h-[190px]" />}>
            <AdCard className="min-h-[190px]" slot="Sidebar" context={{ themeId: theme.id }} />
          </Suspense>
        </Section.Sidebar>
      </Section>
    </>
  )
}
