import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { PlatformCard } from "~/components/catalogue/platform-card"
import { LetterPicker } from "~/components/web/letter-picker"
import { Pagination } from "~/components/web/pagination"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import { findPlatformsByLetter } from "~/server/web/platforms/queries"

type PageProps = {
  params: Promise<{ letter: string }>
  searchParams: Promise<SearchParams>
}

const PLATFORMS_PER_PAGE = 35
const VALID_LETTERS = new Set("abcdefghijklmnopqrstuvwxyz&".split(""))

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { letter } = await params
  const normalizedLetter = letter.toLowerCase()

  return {
    title: `Platforms Starting With ${normalizedLetter.toUpperCase()}`,
    description: `Browse platform and software pages starting with ${normalizedLetter.toUpperCase()} on ${config.site.name}.`,
    openGraph: { ...metadataConfig.openGraph, url: `/platforms/letter/${normalizedLetter}` },
    alternates: {
      ...metadataConfig.alternates,
      canonical: `/platforms/letter/${normalizedLetter}`,
    },
  }
}

export default async function PlatformsLetterPage({ params, searchParams }: PageProps) {
  const { letter } = await params
  const normalizedLetter = letter.toLowerCase()

  if (!VALID_LETTERS.has(normalizedLetter)) {
    notFound()
  }

  const search = await searchParams
  const page = Number(search.page) || 1
  const skip = (page - 1) * PLATFORMS_PER_PAGE

  const { platforms, totalCount } = await findPlatformsByLetter({
    letter: normalizedLetter,
    take: PLATFORMS_PER_PAGE,
    skip,
  })

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/platforms", name: "Platforms" },
          {
            href: `/platforms/letter/${normalizedLetter}`,
            name: normalizedLetter.toUpperCase(),
          },
        ]}
      />

      <Intro>
        <IntroTitle>Platforms Starting With {normalizedLetter.toUpperCase()}</IntroTitle>
        <IntroDescription>
          Browse crawlable platform index pages by letter to discover more theme combinations.
        </IntroDescription>
      </Intro>

      <LetterPicker path="/platforms/letter" />

      <CatalogueGrid>
        {platforms.map(platform => (
          <PlatformCard key={platform.id} platform={platform} showCount />
        ))}
      </CatalogueGrid>

      <Pagination totalCount={totalCount} pageSize={PLATFORMS_PER_PAGE} />
    </>
  )
}
