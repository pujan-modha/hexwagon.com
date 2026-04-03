import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type SearchParams, createLoader, parseAsString } from "nuqs/server";
import { cache } from "react";
import { AdDetailsForm } from "~/app/(web)/advertise/success/form";
import { AdCard } from "~/components/web/ads/ad-card";
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro";
import { Section } from "~/components/web/ui/section";
import { metadataConfig } from "~/config/metadata";
import { verifyAdDraftToken } from "~/lib/ad-draft-token";
import { createAdCheckoutSessionToken } from "~/lib/ad-checkout-session-token";
import { adOnePayload } from "~/server/web/ads/payloads";
import { db } from "~/services/db";
import { stripe } from "~/services/stripe";
import { cx } from "~/utils/cva";
import { tryCatch } from "~/utils/helpers";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

const getCheckoutSession = cache(async (sessionId: string) => {
  const { data, error } = await tryCatch(
    stripe.checkout.sessions.retrieve(sessionId),
  );

  if (error || data.status !== "complete") {
    return null;
  }

  return data;
});

const getPageState = cache(async ({ searchParams }: PageProps) => {
  const searchParamsLoader = createLoader({
    sessionId: parseAsString.withDefault(""),
    draft: parseAsString.withDefault(""),
  });
  const { sessionId, draft } = await searchParamsLoader(searchParams);

  if (draft) {
    const parsedDraft = verifyAdDraftToken(draft);

    if (!parsedDraft) {
      return null;
    }

    return {
      mode: "draft" as const,
      draftToken: draft,
      sessionId: null,
      sessionToken: null,
      defaultEmail: null,
      existingAd: null,
    };
  }

  if (!sessionId) {
    return null;
  }

  const session = await getCheckoutSession(sessionId);

  if (!session) {
    return null;
  }

  const existingAd = await db.ad.findFirst({
    where: { sessionId: session.id },
    select: adOnePayload,
  });

  return {
    mode: "session" as const,
    draftToken: null,
    sessionId: session.id,
    sessionToken: createAdCheckoutSessionToken(session.id),
    defaultEmail: session.customer_details?.email ?? null,
    existingAd,
  };
});

const getMetadata = async () => {
  return {
    title: "Complete your ad booking",
    description:
      "Add your ad details below. We'll review your submission and send a payment link after approval.",
  };
};

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  return {
    ...getMetadata(),
    alternates: {
      ...metadataConfig.alternates,
      canonical: "/advertise/success",
    },
    openGraph: { ...metadataConfig.openGraph, url: "/advertise/success" },
  };
};

export default async function SuccessPage({ searchParams }: PageProps) {
  const state = await getPageState({ searchParams });

  if (!state) {
    return notFound();
  }

  const metadata = await getMetadata();

  return (
    <>
      <Intro alignment="center">
        <IntroTitle>{`${metadata.title}`}</IntroTitle>
        <IntroDescription>{metadata.description}</IntroDescription>
      </Intro>

      <Section>
        <Section.Content
          className={cx(!state.existingAd && "md:col-span-full")}
        >
          <AdDetailsForm
            sessionId={state.sessionId}
            sessionToken={state.sessionToken}
            draftToken={state.draftToken}
            defaultEmail={state.defaultEmail}
            ad={state.existingAd}
            className="w-full max-w-xl mx-auto"
          />
        </Section.Content>

        {state.existingAd && (
          <Section.Sidebar>
            <AdCard overrideAd={state.existingAd} />
          </Section.Sidebar>
        )}
      </Section>
    </>
  );
}
