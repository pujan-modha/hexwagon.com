import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { AdType } from "@prisma/client";
import { Suspense } from "react";
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs";
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro";
import { AdCard } from "~/components/web/ads/ad-card";
import { metadataConfig } from "~/config/metadata";
import { searchThemes } from "~/server/web/themes/queries";
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header";
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid";
import {
  ThemeCard,
  ThemeCardSkeleton,
} from "~/components/catalogue/theme-card";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: "Theme Ports",
  description: "Browse all color themes and their ports across platforms.",
  openGraph: { ...metadataConfig.openGraph, url: "/themes" },
  alternates: { ...metadataConfig.alternates, canonical: "/themes" },
};

const THEMES_PER_PAGE = 35;
const THEME_AD_INDEX = 8;

export default async function ThemesPage(props: PageProps) {
  const search = await props.searchParams;
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "");
  const page = Number(search.page) || 1;

  const { themes, totalCount } = await searchThemes(
    {
      q,
      page,
      perPage: THEMES_PER_PAGE,
      sort: "default",
      theme: [],
      platform: [],
      tag: [],
    },
    q ? undefined : { isFeatured: true },
  );

  const themeCards = themes.flatMap((theme, index) => {
    const cards = [<ThemeCard key={theme.id} theme={theme} showCount />];

    if (index === THEME_AD_INDEX) {
      cards.push(
        <AdCard
          key="themes-list-ad"
          where={{ type: { in: [AdType.Listing, AdType.Ports] } }}
        />,
      );
    }

    return cards;
  });

  if (themes.length <= THEME_AD_INDEX) {
    themeCards.push(
      <AdCard
        key="themes-list-ad"
        where={{ type: { in: [AdType.Listing, AdType.Ports] } }}
      />,
    );
  }

  return (
    <>
      <Breadcrumbs items={[{ href: "/themes", name: "Themes" }]} />

      <Intro>
        <IntroTitle>Browse Themes</IntroTitle>
        <IntroDescription>
          {q
            ? `Found ${totalCount} theme${totalCount !== 1 ? "s" : ""} matching "${q}"`
            : "Discover color themes and their ports across all platforms."}
        </IntroDescription>
      </Intro>

      <CatalogueListHeader title="All Themes" count={totalCount} />

      <Suspense
        fallback={
          <CatalogueGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <ThemeCardSkeleton key={i} />
            ))}
          </CatalogueGrid>
        }
      >
        <CatalogueGrid>{themeCards}</CatalogueGrid>
      </Suspense>
    </>
  );
}
