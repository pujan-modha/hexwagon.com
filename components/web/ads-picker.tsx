"use client";

import { formatDateRange } from "@primoui/utils";
import { cx } from "cva";
import { endOfDay, startOfDay } from "date-fns";
import plur from "plur";
import posthog from "posthog-js";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { createStripeAdsCheckout } from "~/actions/stripe";
import { RelationSelector } from "~/components/admin/relation-selector";
import { AnimatedContainer } from "~/components/common/animated-container";
import { Badge } from "~/components/common/badge";
import { Button } from "~/components/common/button";
import { Checkbox } from "~/components/common/checkbox";
import { Icon } from "~/components/common/icon";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import { Tooltip } from "~/components/common/tooltip";
import { AdsCalendar } from "~/components/web/ads-calendar";
import { Price } from "~/components/web/price";
import { useAds } from "~/hooks/use-ads";
import type { AdMany } from "~/server/web/ads/payloads";
import type { AdSpot } from "~/config/ads";

type AdsPickerProps = ComponentProps<"div"> & {
  ads: AdMany[];
  adSpots: AdSpot[];
  maxDiscountPercentage: number;
  targetingUnitPrice: number;
  targetThemes: {
    slug: string;
    name: string;
    faviconUrl?: string | null;
  }[];
  targetPlatforms: {
    slug: string;
    name: string;
    faviconUrl?: string | null;
  }[];
};

type TargetRelation = {
  id: string;
  name: string;
  faviconUrl?: string | null;
};

export const AdsPicker = ({
  className,
  ads,
  adSpots,
  maxDiscountPercentage,
  targetingUnitPrice,
  targetThemes,
  targetPlatforms,
  ...props
}: AdsPickerProps) => {
  const {
    price,
    selections,
    hasSelections,
    findAdSpot,
    clearSelection,
    updateSelection,
  } = useAds(adSpots, maxDiscountPercentage);

  const [isSidebarTargetingEnabled, setIsSidebarTargetingEnabled] =
    useState(false);
  const [selectedThemeSlugs, setSelectedThemeSlugs] = useState<string[]>([]);
  const [selectedPlatformSlugs, setSelectedPlatformSlugs] = useState<string[]>(
    [],
  );

  const sidebarSelection = selections.find(
    (selection) => selection.type === "Sidebar",
  );
  const hasSidebarSelection = Boolean(
    sidebarSelection?.dateRange?.from && sidebarSelection?.dateRange?.to,
  );

  useEffect(() => {
    if (hasSidebarSelection) return;

    setIsSidebarTargetingEnabled(false);
    setSelectedThemeSlugs([]);
    setSelectedPlatformSlugs([]);
  }, [hasSidebarSelection]);

  const themeRelations = useMemo<TargetRelation[]>(
    () =>
      targetThemes.map((theme) => ({
        id: theme.slug,
        name: theme.name,
        faviconUrl: theme.faviconUrl,
      })),
    [targetThemes],
  );

  const platformRelations = useMemo<TargetRelation[]>(
    () =>
      targetPlatforms.map((platform) => ({
        id: platform.slug,
        name: platform.name,
        faviconUrl: platform.faviconUrl,
      })),
    [targetPlatforms],
  );

  const targetingCount = isSidebarTargetingEnabled
    ? selectedThemeSlugs.length + selectedPlatformSlugs.length
    : 0;

  const targetingSurcharge = targetingCount * targetingUnitPrice;

  const effectiveDiscountedPrice =
    (price?.discountedPrice ?? 0) + targetingSurcharge;
  const effectiveFullPrice = (price?.totalPrice ?? 0) + targetingSurcharge;

  const { execute, isPending } = useServerAction(createStripeAdsCheckout, {
    onSuccess: ({ data }) => {
      posthog.capture("stripe_checkout_ad", {
        ...price,
        targetingCount,
        targetingSurcharge,
        finalPrice: effectiveDiscountedPrice,
      });

      window.open(data, "_blank")?.focus();
    },

    onError: ({ err }) => {
      toast.error(err.message);
    },
  });

  const handleCheckout = () => {
    if (isSidebarTargetingEnabled && targetingCount === 0) {
      toast.error(
        "Select at least one theme or platform to enable targeted sidebar ads.",
      );
      return;
    }

    const checkoutData = selections
      .filter(
        ({ dateRange, duration }) =>
          dateRange?.from && dateRange?.to && duration,
      )
      .map((selection) => {
        const targeting =
          selection.type === "Sidebar" && isSidebarTargetingEnabled
            ? {
                themeSlugs: selectedThemeSlugs,
                platformSlugs: selectedPlatformSlugs,
              }
            : undefined;

        return {
          type: selection.type,
          duration: selection.duration ?? 0,
          metadata: {
            startDate: selection.dateRange?.from?.getTime() ?? 0,
            endDate: selection.dateRange?.to?.getTime() ?? 0,
          },
          targeting,
        };
      });

    execute(checkoutData);
  };

  const isCheckoutDisabled =
    !hasSelections ||
    isPending ||
    (isSidebarTargetingEnabled && targetingCount === 0);

  return (
    <div
      className={cx(
        "flex flex-col min-w-md border divide-y rounded-md",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap overflow-clip">
        {adSpots.map((adSpot) => (
          <AdsCalendar
            key={adSpot.type}
            adSpot={adSpot}
            ads={ads}
            price={price}
            selections={selections}
            updateSelection={updateSelection}
            ignoreBooked={
              adSpot.type === "Sidebar" && isSidebarTargetingEnabled
            }
            className="border-l border-t -ml-px -mt-px"
          />
        ))}
      </div>

      <AnimatedContainer height>
        {hasSelections && (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground p-4">
            {selections.map((selection) => {
              if (
                !selection.dateRange?.from ||
                !selection.dateRange?.to ||
                !selection.duration
              ) {
                return null;
              }

              const adSpot = findAdSpot(selection.type);
              const from = startOfDay(selection.dateRange.from);
              const to = endOfDay(selection.dateRange.to);

              return (
                <div
                  key={selection.type}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2"
                >
                  <span className="flex items-center gap-2 mr-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Clear ${adSpot.label} selection`}
                      prefix={<Icon name="lucide/x" />}
                      onClick={() => clearSelection(selection.type)}
                    />

                    <div>
                      <strong className="font-medium text-foreground">
                        {adSpot.label}
                      </strong>{" "}
                      – ({selection.duration} {plur("day", selection.duration)})
                    </div>
                  </span>

                  <span>{formatDateRange(from, to)}</span>
                </div>
              );
            })}
          </div>
        )}
      </AnimatedContainer>

      <AnimatedContainer height>
        {hasSidebarSelection && (
          <div className="grid gap-3 border-t p-4">
            <Stack className="w-full justify-between">
              <div>
                <strong className="text-sm font-medium text-foreground">
                  Targeted sidebar ads
                </strong>
                <p className="text-xs text-muted-foreground">
                  Pick specific themes/platforms. Matching pages show targeted
                  ads only.
                </p>
              </div>

              <Stack size="sm">
                <Checkbox
                  id="enable-sidebar-targeting"
                  checked={isSidebarTargetingEnabled}
                  onCheckedChange={(checked) =>
                    setIsSidebarTargetingEnabled(checked === true)
                  }
                />
                <label
                  htmlFor="enable-sidebar-targeting"
                  className="text-sm text-foreground"
                >
                  Enable
                </label>
              </Stack>
            </Stack>

            {isSidebarTargetingEnabled && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Themes
                  </p>
                  <RelationSelector
                    relations={themeRelations}
                    selectedIds={selectedThemeSlugs}
                    setSelectedIds={setSelectedThemeSlugs}
                    sortFunction={(a, b) => a.name.localeCompare(b.name)}
                    mapFunction={({ id, name, faviconUrl }) => ({
                      id,
                      name: (
                        <Stack size="xs">
                          {faviconUrl && (
                            <img
                              src={faviconUrl}
                              alt=""
                              className="mr-0.5 size-4 shrink-0 rounded-sm"
                              loading="lazy"
                            />
                          )}
                          <span className="truncate">{name}</span>
                        </Stack>
                      ),
                    })}
                  />
                </div>

                <div className="grid gap-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Platforms
                  </p>
                  <RelationSelector
                    relations={platformRelations}
                    selectedIds={selectedPlatformSlugs}
                    setSelectedIds={setSelectedPlatformSlugs}
                    sortFunction={(a, b) => a.name.localeCompare(b.name)}
                    mapFunction={({ id, name, faviconUrl }) => ({
                      id,
                      name: (
                        <Stack size="xs">
                          {faviconUrl && (
                            <img
                              src={faviconUrl}
                              alt=""
                              className="mr-0.5 size-4 shrink-0 rounded-sm"
                              loading="lazy"
                            />
                          )}
                          <span className="truncate">{name}</span>
                        </Stack>
                      ),
                    })}
                  />
                </div>
              </div>
            )}

            {isSidebarTargetingEnabled && (
              <Note className="text-xs">
                {targetingCount} {plur("target", targetingCount)} × $
                {targetingUnitPrice.toFixed(2)} = $
                {targetingSurcharge.toFixed(2)} extra
              </Note>
            )}
          </div>
        )}
      </AnimatedContainer>

      <Stack className="text-center p-4 sm:justify-between sm:text-start">
        {price ? (
          <>
            <Stack size="sm" className="mr-auto">
              <Note>Total:</Note>
              <Price
                price={effectiveDiscountedPrice}
                fullPrice={effectiveFullPrice}
              />
            </Stack>

            {price.discountPercentage > 0 && (
              <Tooltip
                tooltip={`Discount applied based on the order value. Max ${maxDiscountPercentage}% off.`}
              >
                <Badge
                  size="lg"
                  variant="outline"
                  className="-my-1.5 text-green-700/90 dark:text-green-300/90"
                >
                  {price.discountPercentage}% off
                </Badge>
              </Tooltip>
            )}
          </>
        ) : (
          <Note>Please select dates for at least one ad type</Note>
        )}

        <Button
          variant="fancy"
          size="md"
          disabled={isCheckoutDisabled}
          isPending={isPending}
          className="max-sm:w-full sm:-my-2"
          onClick={handleCheckout}
        >
          Purchase Now
        </Button>
      </Stack>
    </div>
  );
};
