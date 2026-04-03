import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { type SearchParams, createLoader, parseAsString } from "nuqs/server"
import { cache } from "react"
import { AdDetailsForm } from "~/app/(web)/advertise/success/form"
import { Note } from "~/components/common/note"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { Section } from "~/components/web/ui/section"
import { metadataConfig } from "~/config/metadata"
import { verifyAdPackageDraftToken } from "~/lib/ad-package-draft-token"
import { adOnePayload } from "~/server/web/ads/payloads"
import { getAdPackagePricing } from "~/server/web/ads/queries"
import { db } from "~/services/db"
import { stripe } from "~/services/stripe"
import { tryCatch } from "~/utils/helpers"

type PageProps = {
  searchParams: Promise<SearchParams>
}

type BillingCycle = "Weekly" | "Monthly"

const getCheckoutSession = cache(async (sessionId: string) => {
  const { data, error } = await tryCatch(stripe.checkout.sessions.retrieve(sessionId))

  if (error || data.status !== "complete") {
    return null
  }

  return data
})

const getPageState = cache(async ({ searchParams }: PageProps) => {
  const searchParamsLoader = createLoader({
    sessionId: parseAsString.withDefault(""),
    draft: parseAsString.withDefault(""),
  })
  const { sessionId, draft } = await searchParamsLoader(searchParams)

  if (draft) {
    const parsedDraft = verifyAdPackageDraftToken(draft)

    if (!parsedDraft) {
      return null
    }

    const billingCycle: BillingCycle = parsedDraft.billingCycle === "Monthly" ? "Monthly" : "Weekly"
    const themeIds = Array.isArray(parsedDraft.themeIds)
      ? parsedDraft.themeIds.filter((themeId): themeId is string => typeof themeId === "string")
      : []
    const platformIds = Array.isArray(parsedDraft.platformIds)
      ? parsedDraft.platformIds.filter(
          (platformId): platformId is string => typeof platformId === "string",
        )
      : []

    const appPricing = await getAdPackagePricing()
    const isMonthly = billingCycle === "Monthly"

    // Base price
    const basePriceCents = isMonthly
      ? appPricing.monthly.basePriceCents
      : appPricing.weekly.basePriceCents

    // Selected discounted package cost
    const packageCostCents = isMonthly
      ? appPricing.monthly.discountedPriceCents
      : appPricing.weekly.discountedPriceCents

    // Target fee
    const targetsCount = themeIds.length + platformIds.length
    const targetFeeCents =
      targetsCount *
      (isMonthly ? appPricing.monthly.targetUnitPriceCents : appPricing.weekly.targetUnitPriceCents)

    const totalCostCents = packageCostCents + targetFeeCents
    const fullOriginalCostCents = basePriceCents + targetFeeCents

    return {
      mode: "draft" as const,
      draftToken: draft,
      sessionId: null as string | null,
      existingAd: null as Awaited<ReturnType<typeof db.ad.findFirst>>,
      pricingSummary: {
        billingCycle,
        targetCount: targetsCount,
        packageCostCents,
        targetFeeCents,
        totalCostCents,
        fullOriginalCostCents,
      },
    }
  }

  if (!sessionId) {
    return null
  }

  const session = await getCheckoutSession(sessionId)

  if (!session) {
    return null
  }

  const existingAd = await db.ad.findFirst({
    where: { sessionId: session.id },
    select: adOnePayload,
  })

  return {
    mode: "session" as const,
    draftToken: null,
    sessionId: session.id,
    existingAd,
  }
})

const getMetadata = async () => {
  return {
    title: "Ad Campaign",
    description:
      "Set up your campaign details, complete payment, and we will review your ad before it goes live.",
  }
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  return {
    ...getMetadata(),
    alternates: {
      ...metadataConfig.alternates,
      canonical: "/advertise/success",
    },
    openGraph: { ...metadataConfig.openGraph, url: "/advertise/success" },
  }
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const state = await getPageState({ searchParams })

  if (!state) {
    return notFound()
  }

  const metadata = await getMetadata()

  return (
    <>
      <Intro alignment="center">
        <IntroTitle>{`${metadata.title}`}</IntroTitle>
        <IntroDescription>{metadata.description}</IntroDescription>
      </Intro>

      <Section>
        <Section.Content className="md:col-span-full">
          {state.mode === "draft" ? (
            <AdDetailsForm
              draftToken={state.draftToken}
              pricingSummary={state.pricingSummary}
              className="w-full max-w-5xl mx-auto"
            />
          ) : (
            <div className="max-w-2xl mx-auto rounded-md border p-6 space-y-4">
              <h2 className="text-xl font-semibold">Payment received</h2>
              <p className="text-sm text-muted-foreground">
                Your campaign is now pending review in the admin dashboard. Once approved, it will
                go live automatically.
              </p>
              <Note>If the ad is rejected, a full refund is issued automatically.</Note>
              {state.existingAd && (
                <p className="text-sm text-muted-foreground">
                  Campaign: <span className="text-foreground">{state.existingAd.name}</span>
                </p>
              )}
            </div>
          )}
        </Section.Content>
      </Section>
    </>
  )
}
