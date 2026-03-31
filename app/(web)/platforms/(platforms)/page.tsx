import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs";
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro";
import { metadataConfig } from "~/config/metadata";
import { searchPlatforms } from "~/server/web/platforms/queries";
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header";
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid";
import {
  PlatformCard,
  PlatformCardSkeleton,
} from "~/components/catalogue/platform-card";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: "Platforms",
  description: "Browse all platforms and their available theme ports.",
  openGraph: { ...metadataConfig.openGraph, url: "/platforms" },
  alternates: { ...metadataConfig.alternates, canonical: "/platforms" },
};

const PLATFORMS_PER_PAGE = 35;

export default async function PlatformsPage(props: PageProps) {
  const search = await props.searchParams;
  const q = Array.isArray(search.q) ? (search.q[0] ?? "") : (search.q ?? "");
  const page = Number(search.page) || 1;

  const { platforms, totalCount } = await searchPlatforms(
    {
      q,
      page,
      perPage: PLATFORMS_PER_PAGE,
      sort: "default",
      theme: [],
      platform: [],
      tag: [],
    },
    q ? undefined : { isFeatured: true },
  );

  return (
    <>
      <Breadcrumbs items={[{ href: "/platforms", name: "Platforms" }]} />

      <Intro>
        <IntroTitle>Browse Platforms</IntroTitle>
        <IntroDescription>
          {q
            ? `Found ${totalCount} platform${totalCount !== 1 ? "s" : ""} matching "${q}"`
            : "Discover all platforms and their available theme ports."}
        </IntroDescription>
      </Intro>

      <CatalogueListHeader title="All Platforms" count={totalCount} />

      <Suspense
        fallback={
          <CatalogueGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <PlatformCardSkeleton key={i} />
            ))}
          </CatalogueGrid>
        }
      >
        <CatalogueGrid>
          {platforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} showCount />
          ))}
        </CatalogueGrid>
      </Suspense>
    </>
  );
}
