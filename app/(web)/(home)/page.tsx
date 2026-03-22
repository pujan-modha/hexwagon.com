import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { CountBadge, CountBadgeSkeleton } from "~/app/(web)/(home)/count-badge"
import { BuiltWith } from "~/components/web/built-with"
import { ContributionGraph } from "~/components/web/contribution-graph"
import { NewsletterForm } from "~/components/web/newsletter-form"
import { NewsletterProof } from "~/components/web/newsletter-proof"
import { Section } from "~/components/web/ui/section"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { config } from "~/config"
import { findFeaturedThemes } from "~/server/web/themes/queries"
import { findFeaturedPlatforms } from "~/server/web/platforms/queries"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { ThemeCard, ThemeCardSkeleton } from "~/components/catalogue/theme-card"
import { PlatformCard, PlatformCardSkeleton } from "~/components/catalogue/platform-card"

type PageProps = {
  searchParams: Promise<SearchParams>
}

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

          <IntroDescription className="lg:mt-2">{config.site.description}</IntroDescription>

          <Suspense fallback={<CountBadgeSkeleton />}>
            <CountBadge />
          </Suspense>
        </Intro>

        <NewsletterForm
          size="lg"
          className="max-w-sm mx-auto items-center text-center"
          buttonProps={{ children: "Join our community", size: "md", variant: "fancy" }}
        >
          <NewsletterProof />
        </NewsletterForm>

        <BuiltWith medium="hero" className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" />
      </section>

      {/* Featured Themes */}
      <Suspense
        fallback={
          <Section>
            <Section.Content>
              <Intro>
                <IntroTitle>Featured Themes</IntroTitle>
              </Intro>
              <CatalogueGrid>
                {Array.from({ length: 4 }).map((_, i) => (
                  <ThemeCardSkeleton key={i} />
                ))}
              </CatalogueGrid>
            </Section.Content>
          </Section>
        }
      >
        <FeaturedThemes />
      </Suspense>

      {/* Featured Platforms */}
      <Suspense
        fallback={
          <Section>
            <Section.Content>
              <Intro>
                <IntroTitle>Featured Platforms</IntroTitle>
              </Intro>
              <CatalogueGrid>
                {Array.from({ length: 4 }).map((_, i) => (
                  <PlatformCardSkeleton key={i} />
                ))}
              </CatalogueGrid>
            </Section.Content>
          </Section>
        }
      >
        <FeaturedPlatforms />
      </Suspense>
    </>
  )
}

const FeaturedThemes = async () => {
  const themes = await findFeaturedThemes({ take: 4 })

  if (!themes.length) return null

  return (
    <Section>
      <Section.Content>
        <Intro>
          <IntroTitle>Featured Themes</IntroTitle>
        </Intro>
        <CatalogueGrid>
          {themes.map(theme => (
            <ThemeCard key={theme.id} theme={theme} showCount />
          ))}
        </CatalogueGrid>
      </Section.Content>
    </Section>
  )
}

const FeaturedPlatforms = async () => {
  const platforms = await findFeaturedPlatforms({ take: 4 })

  if (!platforms.length) return null

  return (
    <Section>
      <Section.Content>
        <Intro>
          <IntroTitle>Featured Platforms</IntroTitle>
        </Intro>
        <CatalogueGrid>
          {platforms.map(platform => (
            <PlatformCard key={platform.id} platform={platform} showCount />
          ))}
        </CatalogueGrid>
      </Section.Content>
    </Section>
  )
}
