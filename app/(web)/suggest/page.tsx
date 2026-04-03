import type { Metadata } from "next"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { SuggestionForm } from "~/components/web/suggestions/suggestion-form"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"

type PageProps = {
  searchParams: Promise<SearchParams>
}

export const metadata: Metadata = {
  title: "Suggest a Theme or Platform",
  description: "Suggest a new theme or platform for HexWagon.",
  alternates: { ...metadataConfig.alternates, canonical: "/suggest" },
}

export default async function SuggestPage(props: PageProps) {
  const search = await props.searchParams
  const type = search.type === "Platform" ? "Platform" : "Theme"

  return (
    <>
      <Breadcrumbs items={[{ href: "/suggest", name: "Suggest" }]} />

      <Intro>
        <IntroTitle>Suggest a {type}</IntroTitle>
        <IntroDescription>
          Can&apos;t find what you&apos;re looking for? Suggest a new {type.toLowerCase()} for the
          community.
        </IntroDescription>
      </Intro>

      <Suspense fallback={<div>Loading...</div>}>
        <SuggestionForm defaultType={type} />
      </Suspense>
    </>
  )
}
