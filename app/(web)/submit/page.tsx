import type { Metadata } from "next"
import { Suspense } from "react"
import { SubmissionWizard } from "~/components/submission/submission-wizard"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"

const submitTitle = "Submit a Theme Port"
const submitDescription = "Submit a new theme port to HexWagon."

export const metadata: Metadata = {
  title: submitTitle,
  description: submitDescription,
  openGraph: { ...metadataConfig.openGraph, url: "/submit" },
  alternates: { ...metadataConfig.alternates, canonical: "/submit" },
}

export default function SubmitPage() {
  return (
    <>
      <Breadcrumbs items={[{ href: "/submit", name: "Submit" }]} />

      <Intro>
        <IntroTitle>{submitTitle}</IntroTitle>
        <IntroDescription>{submitDescription}</IntroDescription>
      </Intro>

      <Suspense fallback={<div>Loading...</div>}>
        <SubmissionWizard />
      </Suspense>
    </>
  )
}
