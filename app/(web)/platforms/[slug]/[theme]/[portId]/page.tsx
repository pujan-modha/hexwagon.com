import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ImageObject } from "schema-dts";
import { PageViewEvent } from "~/components/analytics/page-view-event";
import { EntityHeaderActions } from "~/components/catalogue/entity-header-actions";
import { EntityLikeButton } from "~/components/catalogue/entity-like-button";
import { EntityReportButton } from "~/components/catalogue/entity-report-button";
import { PortDetail } from "~/components/catalogue/port-detail";
import { Icon } from "~/components/common/icon";
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card";
import { CommentForm } from "~/components/web/comments/comment-form";
import { CommentThread } from "~/components/web/comments/comment-thread";
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs";
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card";
import { Section } from "~/components/web/ui/section";
import { metadataConfig } from "~/config/metadata";
import { canonicalPortHref } from "~/lib/catalogue";
import { findCommentsByPort } from "~/server/web/comments/queries";
import { findPlatform } from "~/server/web/platforms/queries";
import { findPort } from "~/server/web/ports/queries";
import { findPortRouteParams } from "~/server/web/ports/queries";
import { findTheme } from "~/server/web/themes/queries";

type PageProps = {
  params: Promise<{ slug: string; theme: string; portId: string }>;
};

export const generateStaticParams = async () => {
  const ports = await findPortRouteParams();
  return ports.map((port) => ({
    slug: port.platform.slug,
    theme: port.theme.slug,
    portId: port.id,
  }));
};

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { portId } = await props.params;
  const port = await findPort({ where: { id: portId } });

  if (!port) {
    return { title: "Port Not Found" };
  }

  const url = canonicalPortHref(port.theme.slug, port.platform.slug, port.id);

  return {
    title: port.name ?? `${port.theme.name} for ${port.platform.name}`,
    description: port.description ?? undefined,
    alternates: {
      ...metadataConfig.alternates,
      canonical: url,
    },
    openGraph: { ...metadataConfig.openGraph, url },
  };
};

export default async function PlatformPortPage(props: PageProps) {
  const { slug, theme, portId } = await props.params;

  const [platform, themeEntity, port] = await Promise.all([
    findPlatform({ where: { slug } }),
    findTheme({ where: { slug: theme } }),
    findPort({ where: { id: portId } }),
  ]);

  if (!platform || !themeEntity || !port) {
    notFound();
  }

  // URL param validation
  if (port.platform.slug !== slug || port.theme.slug !== theme) {
    notFound();
  }

  const comments = await findCommentsByPort(port.id);
  const canonical = canonicalPortHref(
    port.theme.slug,
    port.platform.slug,
    port.id,
  );
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
        properties={{ portId: port.id, themeSlug: theme, platformSlug: slug }}
      />

      <Breadcrumbs
        items={[
          { href: "/platforms", name: "Platforms" },
          { href: `/platforms/${platform.slug}`, name: platform.name },
          {
            href: `/platforms/${platform.slug}/${themeEntity.slug}`,
            name: themeEntity.name,
          },
          {
            href: `/platforms/${platform.slug}/${themeEntity.slug}/${port.id}`,
            name: port.name ?? "Port",
          },
        ]}
      />

      <Section>
        <Section.Content>
          <PortDetail
            port={port}
            canonicalUrl={canonical}
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
                  icon: <Icon name="lucide/hash" />,
                },
                {
                  label: "Platform",
                  value: port.platform.name,
                  link: `/platforms/${port.platform.slug}`,
                  icon: <Icon name="lucide/globe" />,
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
    </>
  );
}
