import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { AdType } from "@prisma/client";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { Icon } from "~/components/common/icon";
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs";
import { Section } from "~/components/web/ui/section";
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card";
import { EntitySidebarCard } from "~/components/web/ui/entity-sidebar-card";
import { metadataConfig } from "~/config/metadata";
import { findPlatform } from "~/server/web/platforms/queries";
import { findThemes } from "~/server/web/themes/queries";
import { EntityHeader } from "~/components/catalogue/entity-header";
import { EntityTabs } from "~/components/catalogue/entity-tabs";
import { EntityReportButton } from "~/components/catalogue/entity-report-button";
import { PlatformThemesTab } from "~/components/catalogue/platform-themes-tab";
import { MarkdownContent } from "~/components/catalogue/markdown-content";
import { PlatformThemeDocsTab } from "~/components/catalogue/platform-theme-docs-tab";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

const getPlatform = cache(async ({ params }: PageProps) => {
  const { slug } = await params;
  const platform = await findPlatform({ where: { slug } });

  if (!platform) {
    notFound();
  }

  return platform;
});

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const platform = await getPlatform(props);
  const url = `/platforms/${platform.slug}`;

  return {
    title: platform.name,
    description: platform.description ?? `Browse ${platform.name} theme ports.`,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { url, type: "website" },
  };
};

export default async function PlatformPage(props: PageProps) {
  const [platform, searchParams] = await Promise.all([
    getPlatform(props),
    props.searchParams,
  ]);

  const themes = await findThemes({
    where: {
      ports: {
        some: { platformId: platform.id, status: { in: ["Published"] } },
      },
    },
    orderBy: { name: "asc" },
  });

  const tabs = [
    {
      value: "themes",
      label: `Themes (${platform._count.ports})`,
      content: (
        <Suspense fallback={<div>Loading...</div>}>
          <PlatformThemesTab themes={themes} platformSlug={platform.slug} />
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
  ];

  return (
    <>
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
            actions={(
              <EntityReportButton
                entityType="platform"
                entityId={platform.id}
                entityName={platform.name}
              />
            )}
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
                      value: platform.websiteUrl
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, ""),
                      link: platform.websiteUrl,
                      icon: <Icon name="lucide/globe" />,
                    }
                  : undefined,
                {
                  label: "Themes",
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
            footer={`Updated ${platform.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`}
          />

          <Suspense fallback={<AdCardSkeleton className="min-h-[190px]" />}>
            <AdCard
              className="min-h-[190px]"
              where={{ type: { in: [AdType.Sidebar, AdType.PlatformPage] } }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>
    </>
  );
}
