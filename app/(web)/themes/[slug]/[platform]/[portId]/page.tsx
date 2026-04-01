import type { Metadata } from "next";
import { AdType } from "@prisma/client";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ImageObject } from "schema-dts";
import { Icon } from "~/components/common/icon";
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs";
import { Section } from "~/components/web/ui/section";
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card";
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card";
import { metadataConfig } from "~/config/metadata";
import { findTheme } from "~/server/web/themes/queries";
import { findPlatform } from "~/server/web/platforms/queries";
import { findPort } from "~/server/web/ports/queries";
import { findCommentsByPort } from "~/server/web/comments/queries";
import { PortDetail } from "~/components/catalogue/port-detail";
import { CommentThread } from "~/components/web/comments/comment-thread";
import { CommentForm } from "~/components/web/comments/comment-form";
import { PageViewEvent } from "~/components/analytics/page-view-event";
import { EntityReportButton } from "~/components/catalogue/entity-report-button";
import { EntityLikeButton } from "~/components/catalogue/entity-like-button";
import { EntityHeaderActions } from "~/components/catalogue/entity-header-actions";
import { findPortRouteParams } from "~/server/web/ports/queries";

type PageProps = {
  params: Promise<{ slug: string; platform: string; portId: string }>;
};

export const generateStaticParams = async () => {
  const ports = await findPortRouteParams();
  return ports.map((port) => ({
    slug: port.theme.slug,
    platform: port.platform.slug,
    portId: port.id,
  }));
};

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { portId } = await props.params;
  const port = await findPort({ where: { id: portId } });

  if (!port) {
    return { title: "Port Not Found" };
  }

  const url = `/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`;

  return {
    title: port.name ?? `${port.theme.name} for ${port.platform.name}`,
    description: port.description ?? undefined,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { ...metadataConfig.openGraph, url },
  };
};

export default async function ThemePortPage(props: PageProps) {
  const { slug, platform, portId } = await props.params;

  const [theme, platformEntity, port] = await Promise.all([
    findTheme({ where: { slug } }),
    findPlatform({ where: { slug: platform } }),
    findPort({ where: { id: portId } }),
  ]);

  if (!theme || !platformEntity || !port) {
    notFound();
  }

  // URL param validation: ensure port belongs to this theme+platform
  if (port.theme.slug !== slug || port.platform.slug !== platform) {
    notFound();
  }

  const comments = await findCommentsByPort(port.id);
  const jsonLd: ImageObject[] = [];

  if (port.screenshotUrl) {
    jsonLd.push({
      "@type": "ImageObject",
      "url": port.screenshotUrl,
      "contentUrl": port.screenshotUrl,
      "width": "1280",
      "height": "720",
      "caption": `A screenshot of ${port.name ?? `${port.theme.name} for ${port.platform.name}`}`,
    });
  }

  if (port.faviconUrl) {
    jsonLd.push({
      "@type": "ImageObject",
      "url": port.faviconUrl,
      "contentUrl": port.faviconUrl,
      "width": "144",
      "height": "144",
      "caption": `A favicon of ${port.name ?? `${port.theme.name} for ${port.platform.name}`}`,
    });
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
                <EntityLikeButton
                  entityType="port"
                  entityId={port.id}
                  grouped
                />
                <EntityReportButton
                  entityType="port"
                  entityId={port.id}
                  entityName={
                    port.name ?? `${port.theme.name} for ${port.platform.name}`
                  }
                  grouped
                />
              </EntityHeaderActions>
            }
          />

          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Comments</h2>
            <CommentForm portId={port.id} />
            <div className="mt-6">
              <CommentThread comments={comments} portId={port.id} />
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
                  icon: <Icon name="lucide/badge-check" />,
                },
                {
                  label: "Platform",
                  value: port.platform.name,
                  link: `/platforms/${port.platform.slug}`,
                  icon: <Icon name="lucide/arrow-right" />,
                },
                {
                  label: "Submitted",
                  value: port.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  icon: <Icon name="lucide/history" />,
                },
              ].filter(Boolean) as any
            }
            buttonHref={port.repositoryUrl ?? undefined}
            buttonLabel={port.repositoryUrl ? "Open Port Link" : undefined}
            buttonEventName="click_repository"
            buttonEventProps={
              port.repositoryUrl
                ? {
                    portId: port.id,
                    themeSlug: port.theme.slug,
                    platformSlug: port.platform.slug,
                    repositoryUrl: port.repositoryUrl,
                    source: "sidebar_button",
                  }
                : undefined
            }
            footer={`Updated ${port.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`}
          />

          <Suspense fallback={<AdCardSkeleton className="min-h-[190px]" />}>
            <AdCard
              className="min-h-[190px]"
              where={{ type: { in: [AdType.Sidebar, AdType.PortPage] } }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
