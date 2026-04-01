import type { SearchParams } from "nuqs/server";
import { AdType } from "@prisma/client";
import { Suspense } from "react";
import { CountBadge, CountBadgeSkeleton } from "~/app/(web)/(home)/count-badge";
import { Button } from "~/components/common/button";
import { Icon } from "~/components/common/icon";
import { Link } from "~/components/common/link";
import { BuiltWith } from "~/components/web/built-with";
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card";
import { HeroSearch } from "~/components/web/hero-search";
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro";
import { WebGLShader } from "~/components/web/ui/web-gl-shader";
import { config } from "~/config";
import { findPorts } from "~/server/web/ports/queries";
import { findFeaturedThemes } from "~/server/web/themes/queries";
import { findFeaturedPlatforms } from "~/server/web/platforms/queries";
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid";
import {
  ThemeCard,
  ThemeCardSkeleton,
} from "~/components/catalogue/theme-card";
import {
  PlatformCard,
  PlatformCardSkeleton,
} from "~/components/catalogue/platform-card";
import { PortCard, PortCardSkeleton } from "~/components/catalogue/port-card";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default function Home(props: PageProps) {
  return (
    <>
      <section className="relative left-1/2 flex w-dvw -translate-x-1/2 flex-col items-center justify-center overflow-hidden bg-background pb-18">
        <div className="pointer-events-none absolute inset-0 z-0 border-b-2 opacity-60">
          <WebGLShader />
        </div>

        <div className="relative z-20 flex w-full flex-col justify-center gap-y-6">
          <Intro alignment="center">
            <IntroTitle className="max-w-[16em] sm:text-4xl md:text-5xl lg:text-6xl">
              Find Theme Ports Faster
            </IntroTitle>

            <IntroDescription className="lg:mt-2">
              Search by theme, platform, or both.
            </IntroDescription>

            <Suspense fallback={<CountBadgeSkeleton />}>
              <CountBadge />
            </Suspense>
          </Intro>

          <HeroSearch />
        </div>

        {/* <BuiltWith medium="hero" className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" /> */}
      </section>

      {/* Featured Themes */}
      <Suspense
        fallback={
          <section className="flex flex-col gap-8">
            <SpotlightSectionHeader
              title="Featured Themes"
              description="Handpicked themes with strong identity, thoughtful color systems, and reliable maintenance."
              href="/themes"
              ctaLabel="View all themes"
            />
            <CatalogueGrid className="gap-5 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <ThemeCardSkeleton key={i} />
              ))}
            </CatalogueGrid>
          </section>
        }
      >
        <FeaturedThemes />
      </Suspense>

      {/* Featured Platforms */}
      <Suspense
        fallback={
          <section className="flex flex-col gap-8">
            <SpotlightSectionHeader
              title="Featured Platforms"
              description="The most active platforms where great themes and ports are shipping right now."
              href="/platforms"
              ctaLabel="View all platforms"
            />
            <CatalogueGrid className="gap-5 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <PlatformCardSkeleton key={i} />
              ))}
            </CatalogueGrid>
          </section>
        }
      >
        <FeaturedPlatforms />
      </Suspense>

      {/* Trending Ports */}
      <Suspense
        fallback={
          <section className="flex flex-col gap-8">
            <FeaturedSectionHeader title="Trending Ports" />
            <CatalogueGrid className="gap-5 xl:grid-cols-3">
              {Array.from({ length: 4 }).flatMap((_, index) => {
                const cards = [
                  <PortCardSkeleton key={`featured-port-skeleton-${index}`} />,
                ];

                if (index === 1) {
                  cards.push(
                    <AdCardSkeleton key="home-port-listing-ad-skeleton" />,
                  );
                }

                return cards;
              })}
            </CatalogueGrid>
          </section>
        }
      >
        <TrendingPorts />
      </Suspense>
    </>
  );
}

const FeaturedThemes = async () => {
  const themes = await findFeaturedThemes({ take: 4 });

  if (!themes.length) return null;

  return (
    <section className="flex flex-col gap-8">
      <SpotlightSectionHeader
        title="Featured Themes"
        description="Handpicked themes with strong identity, thoughtful color systems, and reliable maintenance."
        href="/themes"
        ctaLabel="View all themes"
      />
      <CatalogueGrid className="gap-5 xl:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} showCount />
        ))}
      </CatalogueGrid>
    </section>
  );
};

const FeaturedPlatforms = async () => {
  const platforms = await findFeaturedPlatforms({ take: 4 });

  if (!platforms.length) return null;

  return (
    <section className="flex flex-col gap-8">
      <SpotlightSectionHeader
        title="Featured Platforms"
        description="The most active platforms where great themes and ports are shipping right now."
        href="/platforms"
        ctaLabel="View all platforms"
      />
      <CatalogueGrid className="gap-5 xl:grid-cols-3">
        {platforms.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} showCount />
        ))}
      </CatalogueGrid>
    </section>
  );
};

const TrendingPorts = async () => {
  const ports = await findPorts({
    orderBy: [{ pageviews: "desc" }, { score: "desc" }],
    take: 4,
  });

  if (!ports.length) return null;

  return (
    <section className="flex flex-col gap-8">
      <FeaturedSectionHeader title="Trending Ports" />
      <CatalogueGrid className="gap-5 xl:grid-cols-3">
        {ports.flatMap((port, index) => {
          const cards = [<PortCard key={port.id} port={port} />];

          if (index === 0) {
            cards.push(
              <AdCard
                key="home-port-listing-ad"
                where={{ type: { in: [AdType.Listing, AdType.Ports] } }}
              />,
            );
          }

          return cards;
        })}
      </CatalogueGrid>
    </section>
  );
};

type SpotlightSectionHeaderProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

const SpotlightSectionHeader = ({
  title,
  description,
  href,
  ctaLabel,
}: SpotlightSectionHeaderProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h2>

          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Button
          asChild
          size="md"
          variant="ghost"
          suffix={<Icon name="lucide/arrow-right" className="opacity-80" />}
          className="w-full rounded-lg border border-border/60 bg-background/60 sm:w-auto"
        >
          <Link href={href} className="whitespace-nowrap">
            {ctaLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
};

type FeaturedSectionHeaderProps = {
  title: string;
};

const FeaturedSectionHeader = ({ title }: FeaturedSectionHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>

        <span
          aria-hidden
          className="hidden h-px flex-1 bg-gradient-to-r from-border via-border/80 to-transparent sm:block"
        />
      </div>
    </div>
  );
};
