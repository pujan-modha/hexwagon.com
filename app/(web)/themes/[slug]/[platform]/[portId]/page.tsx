import type { Metadata } from "next";
import { AdType } from "@prisma/client";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

type PageProps = {
  params: Promise<{ slug: string; platform: string; portId: string }>;
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
    openGraph: { url, type: "website" },
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
                  icon: <Icon name="lucide/layers-3" />,
                },
                {
                  label: "Platform",
                  value: port.platform.name,
                  link: `/platforms/${port.platform.slug}`,
                  icon: <Icon name="lucide/layout-grid" />,
                },
                port.websiteUrl
                  ? {
                      label: "Website",
                      value: port.websiteUrl
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, ""),
                      link: port.websiteUrl,
                      icon: <Icon name="lucide/globe" />,
                    }
                  : undefined,
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
            buttonHref={port.websiteUrl ?? port.repositoryUrl ?? undefined}
            buttonLabel={
              port.websiteUrl
                ? "Visit Website"
                : port.repositoryUrl
                  ? "View Repository"
                  : undefined
            }
            footer={`Updated ${port.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`}
          />

          <Suspense fallback={<AdCardSkeleton />}>
            <AdCard
              where={{ type: { in: [AdType.Sidebar, AdType.PortPage] } }}
              sidebarTargeting={{
                themeSlug: port.theme.slug,
                platformSlug: port.platform.slug,
              }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>
    </>
  );
}
