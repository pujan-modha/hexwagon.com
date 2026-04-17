import { ConfigStatus } from "@prisma/client"
import type { Metadata } from "next"
import Image from "next/image"
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
import { PlatformCard } from "~/components/catalogue/platform-card"
import { ThemeCard } from "~/components/catalogue/theme-card"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card"
import { CommentForm } from "~/components/web/comments/comment-form"
import { CommentThread } from "~/components/web/comments/comment-thread"
import { ExternalLink } from "~/components/web/external-link"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card"
import { Section } from "~/components/web/ui/section"
import { config as appConfig } from "~/config"
import { metadataConfig } from "~/config/metadata"
import { parseConfigFonts, parseConfigScreenshots } from "~/lib/configs"
import {
  buildFaqJsonLd,
  buildKeywords,
  buildRobots,
  hasSeoQueryState,
  parseSearchAliases,
  parseSeoFaqs,
} from "~/lib/seo"
import { findCommentsByConfig } from "~/server/web/comments/queries"
import { findConfig, findConfigRouteParams } from "~/server/web/configs/queries"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

const getConfig = cache(async ({ params }: Pick<PageProps, "params">) => {
  const { slug } = await params
  const config = await findConfig({
    where: {
      slug,
      status: ConfigStatus.Published,
    },
  })

  if (!config) {
    notFound()
  }

  return config
})

export const generateStaticParams = async () => {
  const configs = await findConfigRouteParams()
  return configs.map(config => ({ slug: config.slug }))
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const config = await getConfig(props)
  const search = await props.searchParams
  const url = `/configs/${config.slug}`
  const fallbackDescription =
    config.description ??
    `Explore ${config.name} config and dotfiles, plus linked themes and platforms.`
  const seoTitle = config.seoTitle ?? `${config.name} Config and Dotfiles | ${appConfig.site.name}`
  const seoDescription = config.seoDescription ?? fallbackDescription
  const keywords = buildKeywords(parseSearchAliases(config.searchAliases), [
    config.name,
    `${config.name} config`,
    `${config.name} configs`,
    `${config.name} dotfile`,
    `${config.name} dotfiles`,
  ])

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    robots: buildRobots({ index: !hasSeoQueryState(search), follow: true }),
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: {
      ...metadataConfig.openGraph,
      url,
      title: seoTitle,
      description: seoDescription,
    },
  }
}

export default async function ConfigPage(props: PageProps) {
  const config = await getConfig(props)
  const comments = await findCommentsByConfig(config.id)
  const faqJsonLd = parseSeoFaqs(config.seoFaqs)
  const screenshots = Array.from(
    new Set(
      [...parseConfigScreenshots(config.screenshots), config.screenshotUrl]
        .map(screenshot => screenshot?.trim() ?? "")
        .filter(Boolean),
    ),
  )
  const fonts = parseConfigFonts(config.fonts)
  const primaryThemeId = config.configThemes[0]?.theme.id
  const primaryPlatformId = config.configPlatforms[0]?.platform.id
  const imageJsonLd = []
  const configJsonLd = {
    "@context": "https://schema.org",
    "@type": config.repositoryUrl ? "SoftwareSourceCode" : "CreativeWork",
    name: config.name,
    alternateName: `${config.name} dotfiles`,
    description:
      config.seoDescription ??
      config.description ??
      `${config.name} config and dotfiles with linked themes and platforms.`,
    url: `${appConfig.site.url}/configs/${config.slug}`,
    codeRepository: config.repositoryUrl ?? undefined,
    image: screenshots[0] ?? config.faviconUrl ?? undefined,
    keywords: buildKeywords(parseSearchAliases(config.searchAliases), [
      config.name,
      `${config.name} config`,
      `${config.name} dotfile`,
      `${config.name} dotfiles`,
    ]),
  }

  for (const screenshot of screenshots) {
    imageJsonLd.push({
      "@type": "ImageObject",
      url: screenshot,
      contentUrl: screenshot,
      width: "1280",
      height: "720",
      caption: `A screenshot of ${config.name} config and dotfiles`,
    })
  }

  if (config.faviconUrl) {
    imageJsonLd.push({
      "@type": "ImageObject",
      url: config.faviconUrl,
      contentUrl: config.faviconUrl,
      width: "144",
      height: "144",
      caption: `A favicon of ${config.name} config and dotfiles`,
    })
  }

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <div className="space-y-4">
          {screenshots.length ? (
            <div className={screenshots.length === 1 ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
              {screenshots.map((screenshot, index) => (
                <Image
                  key={`${screenshot}-${index}`}
                  src={screenshot}
                  alt={`${config.name} screenshot ${index + 1}`}
                  width={1280}
                  height={720}
                  className="h-auto w-full rounded-lg border object-cover object-top"
                />
              ))}
            </div>
          ) : null}

          <MarkdownContent
            content={config.content ?? config.description ?? undefined}
            emptyState="No config or dotfile notes available yet."
          />
        </div>
      ),
    },
    {
      value: "themes",
      label: `Themes (${config._count.configThemes})`,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {config.configThemes.map(entry => (
              <ThemeCard key={entry.theme.id} theme={entry.theme} showCount />
            ))}
          </div>
        </div>
      ),
    },
    {
      value: "platforms",
      label: `Platforms (${config._count.configPlatforms})`,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {config.configPlatforms.map(entry => (
              <PlatformCard key={entry.platform.id} platform={entry.platform} showCount />
            ))}
          </div>
        </div>
      ),
    },
    {
      value: "fonts",
      label: `Fonts (${fonts.length})`,
      content: fonts.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {fonts.map((font, index) => (
            <Card key={`${font.name}-${index}`} className="gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{font.name}</h3>
                  <p className="truncate text-sm text-muted-foreground">{font.url}</p>
                </div>

                <Icon name="lucide/hash" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </div>

              <Button variant="secondary" size="md" className="self-start" asChild>
                <ExternalLink href={font.url}>Open Font</ExternalLink>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <MarkdownContent content={undefined} emptyState="No fonts listed for this config yet." />
      ),
    },
  ]

  return (
    <>
      <PageViewEvent
        event="config_viewed"
        properties={{ configId: config.id, configSlug: config.slug }}
      />

      <Breadcrumbs
        items={[
          { href: "/configs", name: "Configs" },
          { href: `/configs/${config.slug}`, name: config.name },
        ]}
      />

      <Section>
        <Section.Content>
          <EntityHeader
            name={config.name}
            description={config.description}
            logoSrc={config.faviconUrl}
            actions={
              <EntityHeaderActions>
                <EntityLikeButton entityType="config" entityId={config.id} grouped />
                <EntityReportButton
                  entityType="config"
                  entityId={config.id}
                  entityName={config.name}
                  grouped
                />
              </EntityHeaderActions>
            }
          >
            {config.repositoryUrl ? (
              <Button
                size="md"
                variant="fancy"
                suffix={<Icon name="lucide/arrow-up-right" />}
                className="self-start"
                asChild
              >
                <ExternalLink
                  href={config.repositoryUrl}
                  eventName="click_repository"
                  eventProps={{
                    url: config.repositoryUrl,
                    source: "detail_button",
                  }}
                >
                  Open Repo
                </ExternalLink>
              </Button>
            ) : null}
          </EntityHeader>

          <EntityTabs tabs={tabs} defaultTab="overview" />

          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Comments</h2>
            <CommentForm configId={config.id} />
            <div className="mt-6">
              <CommentThread comments={comments} />
            </div>
          </div>
        </Section.Content>

        <Section.Sidebar>
          <EntitySidebarCard
            title="Config / Dotfile Details"
            insights={
              [
                config.websiteUrl
                  ? {
                      label: "Website",
                      value: config.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                      link: config.websiteUrl,
                      eventName: "click_website",
                      eventProps: {
                        entityType: "config",
                        entityId: config.id,
                        entitySlug: config.slug,
                        url: config.websiteUrl,
                        source: "sidebar_link",
                      },
                      icon: <Icon name="lucide/globe" />,
                    }
                  : undefined,
                config.repositoryUrl
                  ? {
                      label: "Repository",
                      value: config.repositoryUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                      link: config.repositoryUrl,
                      icon: <Icon name="lucide/git-fork" />,
                    }
                  : undefined,
                {
                  label: "Themes",
                  value: config._count.configThemes,
                  icon: <Icon name="lucide/sparkles" />,
                },
                {
                  label: "Platforms",
                  value: config._count.configPlatforms,
                  icon: <Icon name="lucide/blocks" />,
                },
              ].filter(Boolean) as any
            }
            buttonHref={config.websiteUrl ?? undefined}
            buttonLabel={config.websiteUrl ? "Visit Website" : undefined}
            buttonEventName={config.websiteUrl ? "click_website" : undefined}
            buttonEventProps={
              config.websiteUrl
                ? {
                    entityType: "config",
                    entityId: config.id,
                    entitySlug: config.slug,
                    url: config.websiteUrl,
                    source: "sidebar_button",
                  }
                : undefined
            }
          />

          <Suspense fallback={<AdCardSkeleton className="min-h-[190px]" />}>
            <AdCard
              className="min-h-[190px]"
              slot="Sidebar"
              context={{
                themeId: primaryThemeId,
                platformId: primaryPlatformId,
              }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>

      {faqJsonLd.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(faqJsonLd)) }}
        />
      ) : null}
      {imageJsonLd.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(configJsonLd) }}
      />
    </>
  )
}
