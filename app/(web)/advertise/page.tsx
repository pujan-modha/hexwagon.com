import { headers } from "next/headers"
import Link from "next/link"
import type { Metadata } from "next/types"
import { AdvertisePickers } from "~/app/(web)/advertise/pickers"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Advertisers } from "~/components/web/advertisers"
import { ExternalLink } from "~/components/web/external-link"
import { Stats } from "~/components/web/stats"
import { Testimonial } from "~/components/web/testimonial"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { config } from "~/config"
import { metadataConfig } from "~/config/metadata"
import { siteConfig } from "~/config/site"
import { auth } from "~/lib/auth"

export const metadata: Metadata = {
  title: `Advertise on ${siteConfig.name}`,
  description: `Promote your business or software on ${siteConfig.name} and reach a wide audience of tech enthusiasts.`,
  openGraph: { ...metadataConfig.openGraph, url: "/advertise" },
  alternates: { ...metadataConfig.alternates, canonical: "/advertise" },
}

export default async function AdvertisePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const trackingHref = session?.user ? "/dashboard" : "/auth/login?next=/dashboard"

  return (
    <div className="flex flex-col gap-12 md:gap-14 lg:gap-16">
      <Intro alignment="center">
        <IntroTitle>{`${metadata.title}`}</IntroTitle>

        <IntroDescription className="max-w-3xl">
          Reach developers exploring theme ports and dotfiles. Check our{" "}
          <ExternalLink href={config.links.analytics}>real-time analytics</ExternalLink> to see the
          impact on your business.
        </IntroDescription>
      </Intro>

      <section className="rounded-xl border bg-card px-5 py-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Already purchased a campaign?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {session?.user
                ? "Open your dashboard to track review status, billing, and schedule."
                : "Sign in with the same email you used during ad checkout to track your campaigns."}
            </p>
          </div>

          <Button asChild size="md" variant="secondary">
            <Link href={trackingHref}>
              {session?.user ? "Check your ads" : "Sign in to check ads"}
            </Link>
          </Button>
        </div>
      </section>

      <AdvertisePickers />

      <section className="rounded-xl border bg-card px-5 py-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            FAQ
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Everything you need to know before launching
          </h2>
        </div>

        <div className="divide-y divide-border">
          {config.ads.faq.map(item => (
            <details key={item.question} className="group py-4 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground sm:text-base outline-none">
                <span>{item.question}</span>

                <Icon
                  name="lucide/chevron-down"
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="pt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* <Stats /> */}

      {/* {config.ads.testimonials.map(testimonial => (
        <Testimonial key={testimonial.quote} {...testimonial} />
      ))} */}

      {/* <Advertisers /> */}
    </div>
  )
}
