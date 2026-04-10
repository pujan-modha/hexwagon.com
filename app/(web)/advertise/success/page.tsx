import type { Prisma } from "@prisma/client"
import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { type SearchParams, createLoader, parseAsString } from "nuqs/server"
import { cache } from "react"
import { CheckoutStatusPoller } from "~/app/(web)/advertise/success/checkout-status-poller"
import { AdDetailsForm } from "~/app/(web)/advertise/success/form"
import { Button } from "~/components/common/button"
import { Note } from "~/components/common/note"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { Section } from "~/components/web/ui/section"
import { metadataConfig } from "~/config/metadata"
import { buildRobots } from "~/lib/seo"
import { getAdPackageCheckoutDraft } from "~/lib/ad-package-checkout-draft"
import { verifyAdPackageDraftToken } from "~/lib/ad-package-draft-token"
import { auth } from "~/lib/auth"
import { getAdPackagePricing } from "~/server/web/ads/queries"
import { db } from "~/services/db"

type PageProps = {
  searchParams: Promise<SearchParams>
}

type BillingCycle = "Weekly" | "Monthly"

type SuccessAd = {
  id: string
  name: string
  email: string
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const getDashboardLoginHref = (email: string | null) => {
  const params = new URLSearchParams({ next: "/dashboard" })

  if (email) {
    params.set("email", email)
  }

  return `/auth/login?${params.toString()}`
}

const getPageState = cache(async ({ searchParams }: PageProps) => {
  const searchParamsLoader = createLoader({
    checkoutReferenceId: parseAsString.withDefault(""),
    draft: parseAsString.withDefault(""),
  })
  const { checkoutReferenceId, draft } = await searchParamsLoader(searchParams)

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

    return {
      mode: "draft" as const,
      draftToken: draft,
      billingCycle,
      packagePricing: appPricing,
      initialThemeIds: themeIds,
      initialPlatformIds: platformIds,
    }
  }

  if (!checkoutReferenceId) {
    return null
  }

  const existingAd = await db.ad.findFirst({
    where: {
      billingCheckoutReferenceId: checkoutReferenceId,
    } as Prisma.AdWhereInput,
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  if (!existingAd) {
    const checkoutDraft = await getAdPackageCheckoutDraft(checkoutReferenceId)

    return {
      mode: "pending" as const,
      draftToken: null,
      checkoutReferenceId,
      checkoutEmail: checkoutDraft?.adDetails.email ?? null,
    }
  }

  return {
    mode: "complete" as const,
    draftToken: null,
    checkoutReferenceId,
    existingAd: existingAd as SuccessAd,
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
    ...(await getMetadata()),
    alternates: {
      ...metadataConfig.alternates,
      canonical: "/advertise/success",
    },
    openGraph: { ...metadataConfig.openGraph, url: "/advertise/success" },
    robots: buildRobots({ index: false, follow: true }),
  }
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const state = await getPageState({ searchParams })
  const session = await auth.api.getSession({ headers: await headers() })

  if (!state) {
    return notFound()
  }

  const sessionEmail = session?.user.email ? normalizeEmail(session.user.email) : null

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
              initialEmail={sessionEmail ?? undefined}
              isEmailLocked={Boolean(sessionEmail)}
              billingCycle={state.billingCycle}
              packagePricing={state.packagePricing}
              initialThemeIds={state.initialThemeIds}
              initialPlatformIds={state.initialPlatformIds}
              className="w-full max-w-5xl mx-auto"
            />
          ) : state.mode === "pending" ? (
            <div className="space-y-4">
              <CheckoutStatusPoller checkoutReferenceId={state.checkoutReferenceId} />

              <div className="max-w-2xl mx-auto rounded-md border p-6 space-y-3">
                <h3 className="text-base font-semibold">Track this campaign in your dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  {state.checkoutEmail
                    ? `Use ${state.checkoutEmail} to sign in, then you can monitor this ad from your dashboard.`
                    : "Sign in with the same email used at checkout, then you can monitor this ad from your dashboard."}
                </p>
                <Button asChild size="md">
                  <Link href={getDashboardLoginHref(state.checkoutEmail)}>
                    Sign in to track ads
                  </Link>
                </Button>
              </div>
            </div>
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

              {sessionEmail === normalizeEmail(state.existingAd.email) ? (
                <Button asChild>
                  <Link href="/dashboard">View your ads in dashboard</Link>
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in with {state.existingAd.email} to track this campaign from your
                    dashboard.
                  </p>
                  <Button asChild>
                    <Link href={getDashboardLoginHref(state.existingAd.email)}>
                      Sign in to track ads
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </Section.Content>
      </Section>
    </>
  )
}
