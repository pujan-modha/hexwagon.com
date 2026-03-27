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
import { findTheme } from "~/server/web/themes/queries";
import { findPlatforms } from "~/server/web/platforms/queries";
import { EntityHeader } from "~/components/catalogue/entity-header";
import { EntityTabs } from "~/components/catalogue/entity-tabs";
import { ThemePlatformsTab } from "~/components/catalogue/theme-platforms-tab";
import { ThemeGuidelinesTab } from "~/components/catalogue/theme-guidelines-tab";
import { ColorPaletteTab } from "~/components/catalogue/color-palette-tab";
import type { ThemeOne } from "~/server/web/themes/payloads";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

const getTheme = cache(async ({ params }: PageProps) => {
  const { slug } = await params;
  const theme = await findTheme({ where: { slug } });

  if (!theme) {
    notFound();
  }

  return theme;
});

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const theme = await getTheme(props);
  const url = `/themes/${theme.slug}`;

  return {
    title: theme.name,
    description:
      theme.description ??
      `Browse ${theme.name} theme ports across all platforms.`,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { url, type: "website" },
  };
};

export default async function ThemePage(props: PageProps) {
  const [theme, searchParams] = await Promise.all([
    getTheme(props),
    props.searchParams,
  ]);

  const platforms = await findPlatforms({
    where: {
      ports: { some: { themeId: theme.id, status: { in: ["Published"] } } },
    },
    orderBy: { name: "asc" },
  });

  const tabs = [
    {
      value: "platforms",
      label: `Platforms (${theme._count.ports})`,
      content: (
        <Suspense fallback={<div>Loading...</div>}>
          <ThemePlatformsTab platforms={platforms} />
        </Suspense>
      ),
    },
    {
      value: "colors",
      label: `Colors (${theme.colors.length})`,
      content: <ColorPaletteTab colors={theme.colors} />,
    },
    {
      value: "guidelines",
      label: "Guidelines",
      content: <ThemeGuidelinesTab theme={theme} />,
    },
  ];

  return (
    <>
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
            externalUrl={theme.websiteUrl ?? undefined}
          />

          <EntityTabs tabs={tabs} defaultTab="platforms" />
        </Section.Content>

        <Section.Sidebar>
          <EntitySidebarCard
            title="Theme Details"
            insights={
              [
                {
                  label: "Author",
                  value: theme.author,
                  icon: <Icon name="lucide/user" />,
                },
                theme.websiteUrl
                  ? {
                      label: "Homepage",
                      value: theme.websiteUrl
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, ""),
                      link: theme.websiteUrl,
                      icon: <Icon name="lucide/globe" />,
                    }
                  : undefined,
                {
                  label: "Ports",
                  value: theme._count.ports,
                  icon: <Icon name="lucide/star" />,
                },
                {
                  label: "Submitted",
                  value: theme.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  icon: <Icon name="lucide/history" />,
                },
              ].filter(Boolean) as any
            }
            buttonHref={theme.websiteUrl ?? undefined}
            buttonLabel={theme.websiteUrl ? "Visit Website" : undefined}
            footer={`Updated ${theme.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`}
          />

          <Suspense fallback={<AdCardSkeleton />}>
            <AdCard
              where={{ type: { in: [AdType.Sidebar, AdType.ThemePage] } }}
              sidebarTargeting={{ themeSlug: theme.slug }}
            />
          </Suspense>
        </Section.Sidebar>
      </Section>
    </>
  );
}
