"use client"

import posthog from "posthog-js"
import { type ComponentProps, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { createAdsCheckout } from "~/actions/billing"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { config } from "~/config"
import type { AdPackagePricingSettings } from "~/server/web/ads/queries"
import { cx } from "~/utils/cva"

type AdsPickerProps = ComponentProps<"div"> & {
  packagePricing: AdPackagePricingSettings
}

type BillingCycle = "Weekly" | "Monthly"

const billingCycles = {
  Weekly: "Weekly",
  Monthly: "Monthly",
} as const

const billingCycleCards: Array<{
  cycle: BillingCycle
  title: string
  subtitle: string
  durationLabel: string
  planLabel: "week" | "month"
  days: number
}> = [
  {
    cycle: billingCycles.Monthly,
    title: "Monthly Package",
    subtitle: "Best value for sustained visibility and higher reach.",
    durationLabel: "Runs for 30 days",
    planLabel: "month",
    days: 30,
  },
  {
    cycle: billingCycles.Weekly,
    title: "Weekly Package",
    subtitle: "Fast launch for short campaigns and quick promos.",
    durationLabel: "Runs for 7 days",
    planLabel: "week",
    days: 7,
  },
]

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export const AdsPicker = ({ className, packagePricing, ...props }: AdsPickerProps) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle | null>(null)

  const { execute, isPending } = useServerAction(createAdsCheckout, {
    onSuccess: ({ data }) => {
      window.location.href = data
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const handleGetStarted = (cycle: BillingCycle) => {
    const totalPrice =
      cycle === billingCycles.Monthly
        ? packagePricing.monthly.discountedPriceCents / 100
        : packagePricing.weekly.discountedPriceCents / 100

    setBillingCycle(cycle)

    posthog.capture("ad_booking_started", {
      billingCycle: cycle,
      targetCount: 0,
      totalPrice,
    })

    execute({
      billingCycle: cycle,
      themeIds: [],
      platformIds: [],
    })
  }

  return (
    <div className={cx("flex flex-col w-full gap-8", className)} {...props}>
      <section className="w-full">
        <div className="mx-auto flex flex-wrap justify-center gap-5">
          {billingCycleCards.map(card => {
            const pricing =
              card.cycle === billingCycles.Monthly ? packagePricing.monthly : packagePricing.weekly
            const isSelected = billingCycle === card.cycle
            const isMonthly = card.cycle === billingCycles.Monthly
            const planPrice = pricing.discountedPriceCents / 100
            const dailyPrice = Math.round(planPrice / card.days)

            return (
              <article key={card.cycle} className="relative flex basis-72 grow max-w-80">
                {isMonthly && (
                  <span className="absolute bottom-full inset-x-0 pt-1 pb-2.5 px-6 -mb-2 rounded-t-lg bg-primary/85 text-primary-foreground text-[10px] font-mono -tracking-tighter font-medium uppercase">
                    Most Popular
                  </span>
                )}

                <div
                  className={cx(
                    "outline-transparent transition duration-100 ease-out focus-visible:outline-2 focus-visible:outline-border/50 focus-visible:border-ring group relative flex flex-col w-full border bg-card p-5 rounded-lg after:absolute after:inset-0 after:rounded-lg after:border-4 after:border-background after:pointer-events-none items-stretch gap-8",
                    isMonthly ? "border-primary/75" : "border-border",
                    isSelected && "ring-2 ring-primary/40",
                  )}
                >
                  {isMonthly && (
                    <div className="absolute -top-px -inset-x-px z-1 h-24 rounded-lg overflow-clip pointer-events-none">
                      <div className="-mt-12 size-full bg-primary/10 blur-xl rounded-full" />
                    </div>
                  )}

                  <div className="flex gap-x-4 gap-y-3 flex-col items-start flex-wrap">
                    <div className="flex gap-x-3 gap-y-2 flex-row items-center place-content-start flex-wrap w-full">
                      <h4 className="font-display font-semibold text-xl tracking-micro flex-1 truncate">
                        {card.title}
                      </h4>
                    </div>
                    <p className="text-foreground/50 text-sm text-pretty">{card.subtitle}</p>
                  </div>

                  <div className="relative w-full text-[3em]">
                    <div className="flex items-center">
                      <span className="self-start mr-0.5 text-sm">$</span>
                      <div className="tabular-nums -tracking-wide font-display font-semibold leading-[0.75em]">
                        {dailyPrice}
                      </div>
                      <div className="flex flex-col items-start self-stretch ml-1.5">
                        <div className="mt-auto text-muted-foreground text-sm">/day</div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Billed {usdWhole.format(planPrice)} per {card.planLabel}.
                    </p>
                  </div>

                  <div className="flex gap-x-3 gap-y-2 flex-col flex-wrap my-auto flex-1 items-stretch">
                    <p className="flex gap-3 text-sm">
                      <Icon
                        name="lucide/check"
                        className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-primary/75 text-primary-foreground"
                      />
                      Standard ad placements
                    </p>
                    <p className="flex gap-3 text-sm">
                      <Icon
                        name="lucide/check"
                        className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-primary/75 text-primary-foreground"
                      />
                      Click and impression tracking
                    </p>
                    <p className="flex gap-3 text-sm">
                      <Icon
                        name="lucide/check"
                        className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-primary/75 text-primary-foreground"
                      />
                      {card.durationLabel}
                    </p>
                    <p className="flex gap-3 text-sm">
                      <Icon
                        name="lucide/check"
                        className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-foreground/10"
                      />
                      Targeted add-on available
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleGetStarted(card.cycle)}
                    className="w-full"
                    size="lg"
                    isPending={isPending && billingCycle === card.cycle}
                    variant={isMonthly ? "primary" : "secondary"}
                    suffix={<Icon name="lucide/arrow-up-right" />}
                  >
                    {isPending && billingCycle === card.cycle ? "Redirecting..." : "Get started"}
                  </Button>
                </div>
              </article>
            )
          })}

          <article className="relative flex basis-72 grow max-w-80">
            <div className="outline-transparent transition duration-100 ease-out focus-visible:outline-2 focus-visible:outline-border/50 focus-visible:border-ring group relative flex flex-col w-full border bg-card p-5 rounded-lg after:absolute after:inset-0 after:rounded-lg after:border-4 after:border-background after:pointer-events-none items-stretch gap-8 border-border">
              <div className="flex gap-x-4 gap-y-3 flex-col items-start flex-wrap">
                <div className="flex gap-x-3 gap-y-2 flex-row items-center place-content-start flex-wrap w-full">
                  <h4 className="font-display font-semibold text-xl tracking-micro flex-1 truncate">
                    Custom Partnership
                  </h4>
                </div>
                <p className="text-foreground/50 text-sm text-pretty">
                  Bespoke campaign planning built around your goals and launch timeline.
                </p>
              </div>

              <div className="relative w-full text-[3em]">
                <div className="flex items-center">
                  <div className="tabular-nums -tracking-wide font-display font-semibold leading-[0.75em]">
                    Custom
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Tailored scope and pricing.</p>
              </div>

              <div className="flex gap-x-3 gap-y-2 flex-col flex-wrap my-auto flex-1 items-stretch">
                <p className="flex gap-3 text-sm">
                  <Icon
                    name="lucide/check"
                    className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-primary/75 text-primary-foreground"
                  />
                  Custom campaign planning
                </p>
                <p className="flex gap-3 text-sm">
                  <Icon
                    name="lucide/check"
                    className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-primary/75 text-primary-foreground"
                  />
                  Tailored placement strategy
                </p>
                <p className="flex gap-3 text-sm">
                  <Icon
                    name="lucide/check"
                    className="shrink-0 size-5 stroke-[3px] p-1 rounded-md bg-foreground/10"
                  />
                  Direct coordination with our team
                </p>
              </div>

              <Button
                asChild
                size="lg"
                variant="secondary"
                className="w-full"
                suffix={<Icon name="lucide/arrow-up-right" />}
              >
                <a href={`mailto:${config.site.email}`}>Contact us</a>
              </Button>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
