import { PortStatus, type Prisma } from "@prisma/client"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { Suspense, cache } from "react"
import { PageViewEvent } from "~/components/analytics/page-view-event"
import { EntityHeader } from "~/components/catalogue/entity-header"
import { EntityHeaderActions } from "~/components/catalogue/entity-header-actions"
import { EntityLikeButton } from "~/components/catalogue/entity-like-button"
import { EntityReportButton } from "~/components/catalogue/entity-report-button"
import { EntityTabs } from "~/components/catalogue/entity-tabs"
import { MarkdownContent } from "~/components/catalogue/markdown-content"
import { PlatformThemeDocsTab } from "~/components/catalogue/platform-theme-docs-tab"
import { PlatformThemesTab } from "~/components/catalogue/platform-themes-tab"
import { Icon } from "~/components/common/icon"
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card"
import { Section } from "~/components/web/ui/section"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import { buildKeywords, buildRobots, hasSeoQueryState, parseSearchAliases } from "~/lib/seo"
import { findPlatform } from "~/server/web/platforms/queries"
import { findPlatformSlugs } from "~/server/web/platforms/queries"
import { findFeaturedThemes, findThemes, searchThemes } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

const getThemeOrderBy = (sort: string): Prisma.ThemeFindManyArgs["orderBy"] => {
  if (sort && sort !== "default" && sort.includes(".")) {
    const [sortBy, sortOrder] = sort.split(".") as [string, Prisma.SortOrder]

    if (sortOrder === "asc" || sortOrder === "desc") {
      if (sortBy === "likes") {
        return { likes: { _count: sortOrder } }
      }

      if (["name", "createdAt", "updatedAt", "order"].includes(sortBy)) {
        return { [sortBy]: sortOrder } as Prisma.ThemeFindManyArgs["orderBy"]
      }
    }
  }

  return [{ likes: { _count: "desc" } }, { order: "asc" }, { name: "asc" }]
}

const getPlatform = cache(async ({ params }: PageProps) => {
  const { slug } = await params
  const platform = await findPlatform({ where: { slug } })

  if (!platform) {
    notFound()
  }

  return platform
})

export const generateStaticParams = async () => {
  const platforms = await findPlatformSlugs({})
  return platforms.map(platform => ({ slug: platform.slug }))
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const platform = await getPlatform(props)
  const search = await props.searchParams
  const url = `/platforms/${platform.slug}`

  return {
    title:
      platform.seoTitle ?? `Best ${platform.name} Themes and Theme Ports | ${config.site.name}`,
    description:
      platform.seoDescription ?? platform.description ?? `Browse ${platform.name} theme ports.`,
    keywords: buildKeywords(parseSearchAliases(platform.searchAliases), [
      platform.name,
      `${platform.name} themes`,
      `best ${platform.name} themes`,
    ]),
    robots: buildRobots({ index: !hasSeoQueryState(search), follow: true }),
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: {
      ...metadataConfig.openGraph,
      url,
      title: platform.seoTitle ?? platform.name,
      description:
        platform.seoDescription ?? platform.description ?? `Browse ${platform.name} theme ports.`,
    },
  }
}

export default async function PlatformPage(props: PageProps) {
  const [platform, searchParams] = await Promise.all([getPlatform(props), props.searchParams])

  const q = Array.isArray(searchParams.q) ? (searchParams.q[0] ?? "") : (searchParams.q ?? "")
  const sort = Array.isArray(searchParams.sort)
    ? (searchParams.sort[0] ?? "default")
    : (searchParams.sort ?? "default")

  const themesWhere = {
    ports: {
      some: {
        platformId: platform.id,
        status: { in: [PortStatus.Published] },
      },
    },
  } satisfies Prisma.ThemeWhereInput

  const themes = q
    ? (
        await searchThemes(
          {
            q,
            page: 1,
            perPage: 500,
            sort,
            theme: [],
            platform: [],
            tag: [],
          },
          themesWhere,
        )
      ).themes
    : await findThemes({
        where: themesWhere,
        orderBy: getThemeOrderBy(sort),
      })
  const featuredThemeSuggestions = q
    ? []
    : await findFeaturedThemes({
        where: {
          ...themesWhere,
          id: {
            notIn: themes.map(themeItem => themeItem.id),
          },
        },
        take: 6,
      })
  const linkedThemes = [...themes, ...featuredThemeSuggestions].filter(
    (themeItem, index, allThemes) =>
      allThemes.findIndex(candidate => candidate.id === themeItem.id) === index,
  )

  const tabs = [
        {
          value: "themes",
          label: `Themes (${platform._count.ports})`,
          content: (
            <Suspense fallback={<div>Loading...</div>}>
              <PlatformThemesTab
                themes={linkedThemes}
                platformSlug={platform.slug}
                query={q}
                sort={sort}
              />
            </Suspense>
          ),
        },
    {
      value: "instructions",
      label: "Install Instructions",
      content: (
        <MarkdownContent
          content={platform.installInstructions ?? undefined}
          emptyState="No install instructions available for this platform."
        />
      ),
    },
    {
      value: "docs",
      label: "Theme Creation Docs",
      content: <PlatformThemeDocsTab platform={platform} />,
    },
  ]

  return (
    <>
      <PageViewEvent
        event="platform_viewed"
        properties={{ platformId: platform.id, platformSlug: platform.slug }}
      />

      <Breadcrumbs
        items={[
          { href: "/platforms", name: "Platforms" },
          { href: `/platforms/${platform.slug}`, name: platform.name },
        ]}
      />

      <Section>
        <Section.Content>
          <EntityHeader
            name={platform.name}
            description={platform.description}
            logoSrc={platform.faviconUrl}
            actions={
              <EntityHeaderActions>
                <EntityLikeButton entityType="platform" entityId={platform.id} grouped />
                <EntityReportButton
                  entityType="platform"
                  entityId={platform.id}
                  entityName={platform.name}
                  grouped
                />
              </EntityHeaderActions>
            }
          />

          <EntityTabs tabs={tabs} defaultTab="themes" />
        </Section.Content>

        <Section.Sidebar>
          <EntitySidebarCard
            title="Platform Details"
            insights={
              [
                platform.websiteUrl
                  ? {
                      label: "Website",
                      value: platform.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                      link: platform.websiteUrl,
                      eventName: "click_website",
                      eventProps: {
                        entityType: "platform",
                        entityId: platform.id,
                        entitySlug: platform.slug,
                        url: platform.websiteUrl,
                        source: "sidebar_link",
                      },
                      icon: <Icon name="lucide/globe" />,
                    }
                  : undefined,
                {
                  label: "Ports",
                  value: platform._count.ports,
                  icon: <Icon name="lucide/star" />,
                },
                {
                  label: "Submitted",
                  value: platform.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  icon: <Icon name="lucide/history" />,
                },
              ].filter(Boolean) as any
            }
            buttonHref={platform.websiteUrl ?? undefined}
            buttonLabel={platform.websiteUrl ? "Visit Website" : undefined}
            buttonEventName="click_website"
            buttonEventProps={
              platform.websiteUrl
                ? {
                    entityType: "platform",
                    entityId: platform.id,
                    entitySlug: platform.slug,
                    url: platform.websiteUrl,
                    source: "sidebar_button",
                  }
                : undefined
            }
            footer={`Updated ${platform.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`}
          />

          <Suspense fallback={<AdCardSkeleton className="min-h-[190px]" />}>
            <AdCard
              className="min-h-[190px]"
              slot="Sidebar"
              context={{ platformId: platform.id }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>
    </>
  )
}
