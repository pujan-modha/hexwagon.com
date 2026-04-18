import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import type { ImageObject } from "schema-dts"
import { PageViewEvent } from "~/components/analytics/page-view-event"
import { EntityHeaderActions } from "~/components/catalogue/entity-header-actions"
import { EntityLikeButton } from "~/components/catalogue/entity-like-button"
import { EntityReportButton } from "~/components/catalogue/entity-report-button"
import { PortDetail } from "~/components/catalogue/port-detail"
import { Icon } from "~/components/common/icon"
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card"
import { CommentForm } from "~/components/web/comments/comment-form"
import { CommentThread } from "~/components/web/comments/comment-thread"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card"
import { Section } from "~/components/web/ui/section"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import {
  buildCombinationFaqs,
  buildFaqJsonLd,
  buildKeywords,
  mergeFaqs,
  parseSearchAliases,
  parseSeoFaqs,
} from "~/lib/seo"
import { findCommentsByPort } from "~/server/web/comments/queries"
import { findPlatform } from "~/server/web/platforms/queries"
import { findPort } from "~/server/web/ports/queries"
import { findPortRouteParams } from "~/server/web/ports/queries"
import { findTheme } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ slug: string; platform: string; portId: string }>
}

export const generateStaticParams = async () => {
  const ports = await findPortRouteParams()
  return ports.map(port => ({
    slug: port.theme.slug,
    platform: port.platform.slug,
    portId: port.id,
  }))
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { portId } = await props.params
  const port = await findPort({ where: { id: portId } })

  if (!port) {
    return { title: "Port Not Found" }
  }

  const url = `/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`

  return {
    title:
      port.seoTitle ??
      port.name ??
      `${port.theme.name} for ${port.platform.name} | ${config.site.name}`,
    description: port.seoDescription ?? port.description ?? undefined,
    keywords: buildKeywords(parseSearchAliases(port.searchAliases), [
      `${port.theme.name} for ${port.platform.name}`,
      `${port.theme.name} ${port.platform.name} theme`,
    ]),
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: {
      ...metadataConfig.openGraph,
      url,
      title: port.seoTitle ?? port.name ?? `${port.theme.name} for ${port.platform.name}`,
      description: port.seoDescription ?? port.description ?? undefined,
    },
  }
}

export default async function ThemePortPage(props: PageProps) {
  const { slug, platform, portId } = await props.params

  const [theme, platformEntity, port] = await Promise.all([
    findTheme({ where: { slug } }),
    findPlatform({ where: { slug: platform } }),
    findPort({ where: { id: portId } }),
  ])

  if (!theme || !platformEntity || !port) {
    notFound()
  }

  // URL param validation: ensure port belongs to this theme+platform
  if (port.theme.slug !== slug || port.platform.slug !== platform) {
    notFound()
  }

  const comments = await findCommentsByPort(port.id)
  const jsonLd: ImageObject[] = []
  const faqs = mergeFaqs(
    parseSeoFaqs(port.seoFaqs),
    buildCombinationFaqs({
      themeName: port.theme.name,
      platformName: port.platform.name,
      hasPorts: true,
      portCount: 1,
    }),
  )
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": port.repositoryUrl ? "SoftwareSourceCode" : "CreativeWork",
    name: port.name ?? `${port.theme.name} for ${port.platform.name}`,
    description: port.seoDescription ?? port.description ?? undefined,
    url: `${config.site.url}/themes/${slug}/${platform}/${port.id}`,
    codeRepository: port.repositoryUrl ?? undefined,
    image: port.screenshotUrl ?? port.faviconUrl ?? undefined,
    keywords: buildKeywords(parseSearchAliases(port.searchAliases), [
      `${port.theme.name} for ${port.platform.name}`,
    ]),
  }

  if (port.screenshotUrl) {
    jsonLd.push({
      "@type": "ImageObject",
      url: port.screenshotUrl,
      contentUrl: port.screenshotUrl,
      width: "1280",
      height: "720",
      caption: `A screenshot of ${port.name ?? `${port.theme.name} for ${port.platform.name}`}`,
    })
  }

  if (port.faviconUrl) {
    jsonLd.push({
      "@type": "ImageObject",
      url: port.faviconUrl,
      contentUrl: port.faviconUrl,
      width: "144",
      height: "144",
      caption: `A favicon of ${port.name ?? `${port.theme.name} for ${port.platform.name}`}`,
    })
  }

  return (
    <>
      <PageViewEvent
        event="port_viewed"
        properties={{
          portId: port.id,
          themeSlug: slug,
          platformSlug: platform,
        }}
      />

      <Breadcrumbs
        items={[
          { href: "/themes", name: "Themes" },
          { href: `/themes/${theme.slug}`, name: theme.name },
          {
            href: `/themes/${theme.slug}/${platform}`,
            name: platformEntity.name,
          },
          {
            href: `/themes/${theme.slug}/${platform}/${port.id}`,
            name: port.name ?? "Port",
          },
        ]}
      />

      <Section>
        <Section.Content>
          <PortDetail
            port={port}
            canonicalUrl={`/themes/${slug}/${platform}/${portId}`}
            likeButton={
              <EntityHeaderActions>
                <EntityLikeButton entityType="port" entityId={port.id} grouped />
                <EntityReportButton
                  entityType="port"
                  entityId={port.id}
                  entityName={port.name ?? `${port.theme.name} for ${port.platform.name}`}
                  grouped
                />
              </EntityHeaderActions>
            }
          />

          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Comments</h2>
            <CommentForm portId={port.id} />
            <div className="mt-6">
              <CommentThread comments={comments} />
            </div>
          </div>
        </Section.Content>

        <Section.Sidebar>
          <EntitySidebarCard
            title="Port Details"
            insights={
              [
                {
                  label: "Theme",
                  value: port.theme.name,
                  link: `/themes/${port.theme.slug}`,
                  icon: <Icon name="lucide/hash" />,
                },
                {
                  label: "Platform",
                  value: port.platform.name,
                  link: `/platforms/${port.platform.slug}`,
                  icon: <Icon name="lucide/globe" />,
                },
              ].filter(Boolean) as any
            }
          />

          <Suspense fallback={<AdCardSkeleton className="min-h-[190px]" />}>
            <AdCard
              className="min-h-[190px]"
              slot="Sidebar"
              context={{
                themeId: port.theme.id,
                platformId: port.platform.id,
              }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(faqs)) }}
      />
    </>
  )
}
