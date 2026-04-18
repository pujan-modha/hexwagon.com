import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { CatalogueGrid } from "~/components/catalogue/catalogue-grid"
import { ThemeCard } from "~/components/catalogue/theme-card"
import { LetterPicker } from "~/components/web/letter-picker"
import { Pagination } from "~/components/web/pagination"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import { findThemesByLetter } from "~/server/web/themes/queries"

type PageProps = {
  params: Promise<{ letter: string }>
  searchParams: Promise<SearchParams>
}

const THEMES_PER_PAGE = 35
const VALID_LETTERS = new Set("abcdefghijklmnopqrstuvwxyz&".split(""))

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { letter } = await params
  const normalizedLetter = letter.toLowerCase()

  return {
    title: `Themes Starting With ${normalizedLetter.toUpperCase()}`,
    description: `Browse theme families starting with ${normalizedLetter.toUpperCase()} on ${config.site.name}.`,
    openGraph: { ...metadataConfig.openGraph, url: `/themes/letter/${normalizedLetter}` },
    alternates: {
      ...metadataConfig.alternates,
      canonical: `/themes/letter/${normalizedLetter}`,
    },
  }
}

export default async function ThemesLetterPage({ params, searchParams }: PageProps) {
  const { letter } = await params
  const normalizedLetter = letter.toLowerCase()

  if (!VALID_LETTERS.has(normalizedLetter)) {
    notFound()
  }

  const search = await searchParams
  const page = Number(search.page) || 1
  const skip = (page - 1) * THEMES_PER_PAGE

  const { themes, totalCount } = await findThemesByLetter({
    letter: normalizedLetter,
    take: THEMES_PER_PAGE,
    skip,
  })

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/themes", name: "Themes" },
          { href: `/themes/letter/${normalizedLetter}`, name: normalizedLetter.toUpperCase() },
        ]}
      />

      <Intro>
        <IntroTitle>Themes Starting With {normalizedLetter.toUpperCase()}</IntroTitle>
        <IntroDescription>
          Browse crawlable theme index pages by letter to discover combinations faster.
        </IntroDescription>
      </Intro>

      <LetterPicker path="/themes/letter" />

      <CatalogueGrid>
        {themes.map(theme => (
          <ThemeCard key={theme.id} theme={theme} showCount />
        ))}
      </CatalogueGrid>

      <Pagination totalCount={totalCount} pageSize={THEMES_PER_PAGE} />
    </>
  )
}
