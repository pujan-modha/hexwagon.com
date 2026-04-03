"use client";

import posthog from "posthog-js";
import { type ComponentProps, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { createStripeAdsCheckout } from "~/actions/stripe";
import {
  searchPlatformsAction,
  searchThemesAction,
} from "~/actions/widget-search";
import { Badge } from "~/components/common/badge";
import { Button } from "~/components/common/button";
import { Icon } from "~/components/common/icon";
import { Input } from "~/components/common/input";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import { Price } from "~/components/web/price";
import { Favicon } from "~/components/web/ui/favicon";
import type { AdPackagePricingSettings } from "~/server/web/ads/queries";
import { cx } from "~/utils/cva";

type TargetOption = {
  id: string;
  label: string;
  logoUrl?: string | null;
  isVerified?: boolean;
};

type AdsPickerProps = ComponentProps<"div"> & {
  packagePricing: AdPackagePricingSettings;
};

type BillingCycle = "Weekly" | "Monthly";

const billingCycles = {
  Weekly: "Weekly",
  Monthly: "Monthly",
} as const;

const billingCycleCards: Array<{
  cycle: BillingCycle;
  title: string;
  subtitle: string;
  durationLabel: string;
}> = [
  {
    cycle: billingCycles.Weekly,
    title: "Weekly Package",
    subtitle: "Fast launch for short campaigns and quick promos.",
    durationLabel: "Runs for 7 days",
  },
  {
    cycle: billingCycles.Monthly,
    title: "Monthly Package",
    subtitle: "Best value for sustained visibility and higher reach.",
    durationLabel: "Runs for 30 days",
  },
];

export const AdsPicker = ({
  className,
  packagePricing,
  ...props
}: AdsPickerProps) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<TargetOption[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<TargetOption[]>(
    [],
  );
  const [themeQuery, setThemeQuery] = useState("");
  const [platformQuery, setPlatformQuery] = useState("");
  const [themeResults, setThemeResults] = useState<TargetOption[]>([]);
  const [platformResults, setPlatformResults] = useState<TargetOption[]>([]);
  const [isThemesLoading, setIsThemesLoading] = useState(false);
  const [isPlatformsLoading, setIsPlatformsLoading] = useState(false);

  const themeSearchRequestRef = useRef(0);
  const platformSearchRequestRef = useRef(0);

  const selectedCyclePricing =
    billingCycle === billingCycles.Monthly
      ? packagePricing.monthly
      : billingCycle === billingCycles.Weekly
        ? packagePricing.weekly
        : null;

  const themeIds = selectedThemes.map((theme) => theme.id);
  const platformIds = selectedPlatforms.map((platform) => platform.id);
  const targetCount = themeIds.length + platformIds.length;

  const computedPrice = useMemo(() => {
    if (!selectedCyclePricing) {
      return {
        basePrice: 0,
        discountedPrice: 0,
        targetFee: 0,
        totalPrice: 0,
      };
    }

    const basePrice = selectedCyclePricing.basePriceCents / 100;
    const discountedPrice = selectedCyclePricing.discountedPriceCents / 100;
    const targetFee =
      (selectedCyclePricing.targetUnitPriceCents / 100) * targetCount;

    return {
      basePrice,
      discountedPrice,
      targetFee,
      totalPrice: discountedPrice + targetFee,
    };
  }, [selectedCyclePricing, targetCount]);

  const handleThemeSearch = async (value: string) => {
    setThemeQuery(value);
    const query = value.trim();

    if (query.length < 2) {
      setThemeResults([]);
      setIsThemesLoading(false);
      return;
    }

    const requestId = ++themeSearchRequestRef.current;
    setIsThemesLoading(true);

    const [results, error] = await searchThemesAction({ query });

    if (requestId !== themeSearchRequestRef.current) {
      return;
    }

    if (error) {
      setThemeResults([]);
      setIsThemesLoading(false);
      return;
    }

    setThemeResults(
      (results ?? []).map((theme) => ({
        id: theme.id,
        label: theme.name,
        logoUrl: theme.faviconUrl,
        isVerified: theme.isVerified,
      })),
    );
    setIsThemesLoading(false);
  };

  const handlePlatformSearch = async (value: string) => {
    setPlatformQuery(value);
    const query = value.trim();

    if (query.length < 2) {
      setPlatformResults([]);
      setIsPlatformsLoading(false);
      return;
    }

    const requestId = ++platformSearchRequestRef.current;
    setIsPlatformsLoading(true);

    const [results, error] = await searchPlatformsAction({ query });

    if (requestId !== platformSearchRequestRef.current) {
      return;
    }

    if (error) {
      setPlatformResults([]);
      setIsPlatformsLoading(false);
      return;
    }

    setPlatformResults(
      (results ?? []).map((platform) => ({
        id: platform.id,
        label: platform.name,
        logoUrl: platform.faviconUrl,
        isVerified: platform.isVerified,
      })),
    );
    setIsPlatformsLoading(false);
  };

  const { execute, isPending } = useServerAction(createStripeAdsCheckout, {
    onSuccess: ({ data }) => {
      posthog.capture("ad_booking_started", {
        billingCycle,
        targetCount,
        totalPrice: computedPrice.totalPrice,
      });

      window.location.href = data;
    },

    onError: ({ err }) => {
      toast.error(err.message);
    },
  });

  const toggleTarget = (
    item: TargetOption,
    selected: TargetOption[],
    setSelected: (next: TargetOption[]) => void,
  ) => {
    const isSelected = selected.some((entry) => entry.id === item.id);

    if (isSelected) {
      setSelected(selected.filter((entry) => entry.id !== item.id));
      return;
    }

    setSelected([...selected, item]);
  };

  const handleContinue = () => {
    if (!billingCycle) {
      toast.error("Please select a package first.");
      return;
    }

    execute({
      billingCycle,
      themeIds,
      platformIds,
    });
  };

  return (
    <div className={cx("flex flex-col w-full gap-8", className)} {...props}>
      <section className="w-full">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 md:flex-row md:justify-center">
          {billingCycleCards.map((card) => {
            const pricing =
              card.cycle === billingCycles.Monthly
                ? packagePricing.monthly
                : packagePricing.weekly;
            const isSelected = billingCycle === card.cycle;
            const isMonthly = card.cycle === billingCycles.Monthly;

            return (
              <article
                key={card.cycle}
                className={cx(
                  "relative flex w-full md:w-1/2 md:max-w-[340px] flex-col overflow-hidden rounded-2xl border p-8 transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/30",
                )}
              >
                {isMonthly && (
                  <span className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most Popular
                  </span>
                )}

                <h4 className="text-xl font-bold tracking-tight text-foreground">
                  {card.title}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {card.subtitle}
                </p>

                <div className="my-8">
                  <Price
                    price={pricing.discountedPriceCents / 100}
                    fullPrice={pricing.basePriceCents / 100}
                    interval={
                      card.cycle === billingCycles.Monthly ? "month" : "week"
                    }
                    priceClassName="text-4xl font-extrabold tracking-tight"
                  />
                </div>

                <ul className="mb-8 space-y-4 text-sm text-muted-foreground mt-auto">
                  <li className="flex items-center gap-3">
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Icon name="lucide/check" className="size-3" />
                    </span>
                    Rotates across all 4 placements
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Icon name="lucide/check" className="size-3" />
                    </span>
                    {card.durationLabel}
                  </li>
                  {isMonthly && (
                    <li className="flex items-center gap-3">
                      <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                        <Icon name="lucide/check" className="size-3" />
                      </span>
                      Discount on targeted ads
                    </li>
                  )}
                  <li className="flex items-center gap-3">
                    <span className="grid size-5 place-items-center rounded-full bg-muted text-muted-foreground shrink-0">
                      <Icon name="lucide/plus" className="size-3" />
                    </span>
                    Optional targeting add-on
                  </li>
                </ul>

                <Button
                  type="button"
                  onClick={() => setBillingCycle(card.cycle)}
                  className="w-full mt-auto"
                  size="md"
                  variant={isSelected ? "fancy" : "primary"}
                >
                  {isSelected ? "Selected" : "Get started"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      {billingCycle && selectedCyclePricing && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Add targeted visibility boost
              </h3>
              <span className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground w-fit font-normal">
                +${(selectedCyclePricing.targetUnitPriceCents / 100).toFixed(2)}
                /target/
                {billingCycle === billingCycles.Monthly ? "month" : "week"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Search and add your targets to get a 2x visibility boost in those
              categories.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TargetSearchSelect
              title="Themes"
              query={themeQuery}
              onQueryChange={handleThemeSearch}
              options={themeResults}
              selectedItems={selectedThemes}
              isLoading={isThemesLoading}
              onToggle={(item) =>
                toggleTarget(item, selectedThemes, setSelectedThemes)
              }
              emptyMessage="No themes found."
            />

            <TargetSearchSelect
              title="Platforms"
              query={platformQuery}
              onQueryChange={handlePlatformSearch}
              options={platformResults}
              selectedItems={selectedPlatforms}
              isLoading={isPlatformsLoading}
              onToggle={(item) =>
                toggleTarget(item, selectedPlatforms, setSelectedPlatforms)
              }
              emptyMessage="No platforms found."
            />
          </div>

          {selectedThemes.length === 0 && selectedPlatforms.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No targets selected. Campaign will run with standard visibility.
            </p>
          )}
        </section>
      )}

      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          {billingCycle && selectedCyclePricing ? (
            <>
              <p className="text-sm font-medium text-foreground">
                Total summary
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <Price
                  price={computedPrice.totalPrice}
                  fullPrice={computedPrice.basePrice + computedPrice.targetFee}
                  interval={
                    billingCycle === billingCycles.Monthly ? "month" : "week"
                  }
                  priceClassName="text-3xl font-extrabold tracking-tight"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Includes base package ({billingCycle}) + {targetCount} target
                {targetCount === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Select a package to see total summary
            </p>
          )}
        </div>

        <Button
          variant="fancy"
          size="lg"
          disabled={!billingCycle}
          isPending={isPending}
          className="w-full sm:w-auto min-w-[200px] font-semibold"
          onClick={handleContinue}
        >
          {billingCycle ? "Proceed to checkout" : "Select a package"}
        </Button>
      </div>
    </div>
  );
};

type TargetSearchSelectProps = {
  title: string;
  query: string;
  onQueryChange: (value: string) => void;
  options: TargetOption[];
  selectedItems: TargetOption[];
  onToggle: (item: TargetOption) => void;
  isLoading: boolean;
  emptyMessage: string;
};

const TargetSearchSelect = ({
  title,
  query,
  onQueryChange,
  options,
  selectedItems,
  onToggle,
  isLoading,
  emptyMessage,
}: TargetSearchSelectProps) => {
  const normalizedQuery = query.trim();
  const selectedIds = selectedItems.map((item) => item.id);
  const unselectedOptions = options.filter(
    (opt) => !selectedIds.includes(opt.id),
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="border-b bg-muted/20 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {title}
        </p>

        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="h-9"
        />
      </div>

      <div className="max-h-64 overflow-y-auto flex flex-col">
        {selectedItems.map((option) => (
          <button
            type="button"
            key={`selected-${option.id}`}
            onClick={() => onToggle(option)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors border-b last:border-b-0 bg-primary/5 hover:bg-destructive/10 group"
          >
            <span className="flex min-w-0 items-center gap-3">
              {option.logoUrl ? (
                <Favicon
                  src={option.logoUrl}
                  title={option.label}
                  plain
                  className="size-6 rounded-md bg-transparent"
                />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                  {option.label.slice(0, 1)}
                </span>
              )}
              <span className="truncate text-sm font-medium text-foreground flex items-center gap-1.5">
                {option.label}
                {option.isVerified && (
                  <Icon
                    name="lucide/badge-check"
                    className="size-4 text-blue-500 shrink-0"
                  />
                )}
              </span>
            </span>

            <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-destructive/10 group-hover:text-destructive transition-colors">
              <Icon
                name="lucide/check"
                className="size-3.5 group-hover:hidden"
              />
              <Icon
                name="lucide/x"
                className="size-3.5 hidden group-hover:block"
              />
            </span>
          </button>
        ))}

        {normalizedQuery.length < 2 && selectedItems.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}

        {normalizedQuery.length >= 2 && isLoading && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Searching...
          </p>
        )}

        {normalizedQuery.length >= 2 &&
          !isLoading &&
          unselectedOptions.length === 0 &&
          selectedItems.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}

        {normalizedQuery.length >= 2 &&
          !isLoading &&
          unselectedOptions.map((option) => (
            <button
              type="button"
              key={`option-${option.id}`}
              onClick={() => onToggle(option)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors border-b last:border-b-0 hover:bg-accent/50"
            >
              <span className="flex min-w-0 items-center gap-3">
                {option.logoUrl ? (
                  <Favicon
                    src={option.logoUrl}
                    title={option.label}
                    plain
                    className="size-6 rounded-md bg-transparent"
                  />
                ) : (
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                    {option.label.slice(0, 1)}
                  </span>
                )}
                <span className="truncate text-sm font-medium text-foreground flex items-center gap-1.5">
                  {option.label}
                  {option.isVerified && (
                    <Icon
                      name="lucide/badge-check"
                      className="size-4 text-blue-500 shrink-0"
                    />
                  )}
                </span>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
};
