import type { SearchParams } from "nuqs/server";
import { AdType } from "@prisma/client";
import { Suspense } from "react";
import { CountBadge, CountBadgeSkeleton } from "~/app/(web)/(home)/count-badge";
import { BuiltWith } from "~/components/web/built-with";
import { ContributionGraph } from "~/components/web/contribution-graph";
import { AdCard, AdCardSkeleton } from "~/components/web/ads/ad-card";
import { NewsletterForm } from "~/components/web/newsletter-form";
import { NewsletterProof } from "~/components/web/newsletter-proof";
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
} from "~/components/common/card";
import { H4 } from "~/components/common/heading";
import { Link } from "~/components/common/link";
import { Skeleton } from "~/components/common/skeleton";
import { Favicon } from "~/components/web/ui/favicon";
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
import type { PortMany } from "~/server/web/ports/payloads";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default function Home(props: PageProps) {
  return (
    <>
      <section className="relative flex flex-col justify-center gap-y-6 pb-18">
        <div className="absolute left-1/2 bottom-0 -z-10 w-dvw h-3/5 border-b bg-gradient-to-t from-card to-transparent -translate-x-1/2 overflow-hidden select-none dark:from-background/95 dark:border-card-dark">
          <ContributionGraph className="size-full object-cover mask-t-from-0% opacity-10 translate-y-1 dark:mix-blend-color-dodge" />
        </div>

        <Intro alignment="center">
          <IntroTitle className="max-w-[16em] sm:text-4xl md:text-5xl lg:text-6xl">
            Discover {config.site.tagline}
          </IntroTitle>

          <IntroDescription className="lg:mt-2">
            {config.site.description}
          </IntroDescription>

          <Suspense fallback={<CountBadgeSkeleton />}>
            <CountBadge />
          </Suspense>
        </Intro>

        <NewsletterForm
          size="lg"
          className="max-w-sm mx-auto items-center text-center"
          buttonProps={{
            children: "Join our community",
            size: "md",
            variant: "fancy",
          }}
        >
          <NewsletterProof />
        </NewsletterForm>

        {/* <BuiltWith medium="hero" className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" /> */}
      </section>

      {/* Featured Themes */}
      <Suspense
        fallback={
          <section className="flex flex-col gap-8">
            <Intro>
              <IntroTitle>Featured Themes</IntroTitle>
            </Intro>
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
            <Intro>
              <IntroTitle>Featured Platforms</IntroTitle>
            </Intro>
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

      {/* Featured Ports */}
      <Suspense
        fallback={
          <section className="flex flex-col gap-8">
            <Intro>
              <IntroTitle>Featured Ports</IntroTitle>
            </Intro>
            <CatalogueGrid className="gap-5 xl:grid-cols-3">
              {Array.from({ length: 4 }).flatMap((_, index) => {
                const cards = [
                  <FeaturedPortCardSkeleton
                    key={`featured-port-skeleton-${index}`}
                  />,
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
        <FeaturedPorts />
      </Suspense>
    </>
  );
}

const FeaturedThemes = async () => {
  const themes = await findFeaturedThemes({ take: 4 });

  if (!themes.length) return null;

  return (
    <section className="flex flex-col gap-8">
      <Intro>
        <IntroTitle>Featured Themes</IntroTitle>
      </Intro>
      <CatalogueGrid className="gap-5 xl:grid-cols-3">
        {themes.flatMap((theme, index) => {
          const cards = [<ThemeCard key={theme.id} theme={theme} showCount />];

          if (index === 0) {
            cards.push(
              <AdCard
                key="home-theme-listing-ad"
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

const FeaturedPlatforms = async () => {
  const platforms = await findFeaturedPlatforms({ take: 4 });

  if (!platforms.length) return null;

  return (
    <section className="flex flex-col gap-8">
      <Intro>
        <IntroTitle>Featured Platforms</IntroTitle>
      </Intro>
      <CatalogueGrid className="gap-5 xl:grid-cols-3">
        {platforms.flatMap((platform, index) => {
          const cards = [
            <PlatformCard key={platform.id} platform={platform} showCount />,
          ];

          if (index === 0) {
            cards.push(
              <AdCard
                key="home-platform-listing-ad"
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

const FeaturedPorts = async () => {
  const ports = await findPorts({ where: { isFeatured: true }, take: 4 });

  if (!ports.length) return null;

  return (
    <section className="flex flex-col gap-8">
      <Intro>
        <IntroTitle>Featured Ports</IntroTitle>
      </Intro>
      <CatalogueGrid className="gap-5 xl:grid-cols-3">
        {ports.flatMap((port, index) => {
          const cards = [<FeaturedPortCard key={port.id} port={port} />];

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

const FeaturedPortCard = ({ port }: { port: PortMany }) => {
  return (
    <Card asChild>
      <Link
        href={`/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`}
      >
        <CardHeader wrap={false}>
          <Favicon
            src={port.faviconUrl}
            title={port.name ?? port.theme.name}
            plain
          />

          <H4 as="h3" className="truncate">
            {port.name ?? port.theme.name}
          </H4>
        </CardHeader>

        <CardDescription className="min-h-[3.75rem] line-clamp-3">
          {port.description || "\u00A0"}
        </CardDescription>

        <CardFooter className="mt-auto text-sm text-muted-foreground">
          {port.theme.name} · {port.platform.name}
        </CardFooter>
      </Link>
    </Card>
  );
};

const FeaturedPortCardSkeleton = () => {
  return (
    <Card hover={false} className="items-stretch select-none">
      <CardHeader wrap={false}>
        <Favicon
          src="/favicon.png"
          plain
          className="animate-pulse opacity-50"
        />

        <H4 className="w-2/3">
          <Skeleton>&nbsp;</Skeleton>
        </H4>
      </CardHeader>

      <CardDescription className="flex flex-col gap-0.5">
        <Skeleton className="h-5 w-4/5">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-3/4">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-1/2">&nbsp;</Skeleton>
      </CardDescription>

      <CardFooter>
        <Skeleton className="h-4 w-1/3">&nbsp;</Skeleton>
      </CardFooter>
    </Card>
  );
};
