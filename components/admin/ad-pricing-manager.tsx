"use client";

import * as React from "react";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Button } from "~/components/common/button";
import { Input } from "~/components/common/input";
import { Note } from "~/components/common/note";
import { adsConfig, type AdSpotType } from "~/config/ads";
import type { AdPricingMap } from "~/server/web/ads/queries";
import { updateAdPricing } from "~/server/admin/ads/actions";

type AdPricingManagerProps = {
  initialPricing: AdPricingMap;
};

const centsToDollars = (price: number) => price.toFixed(2);

export const AdPricingManager = ({ initialPricing }: AdPricingManagerProps) => {
  const [prices, setPrices] = React.useState<Record<AdSpotType, string>>({
    Banner: centsToDollars(initialPricing.Banner),
    Listing: centsToDollars(initialPricing.Listing),
    Sidebar: centsToDollars(initialPricing.Sidebar),
  });

  const { execute, isPending } = useServerAction(updateAdPricing, {
    onSuccess: () => toast.success("Ad pricing updated."),
    onError: ({ err }) => toast.error(err.message),
  });

  const handleSave = () => {
    const banner = Number(prices.Banner);
    const listing = Number(prices.Listing);
    const sidebar = Number(prices.Sidebar);

    if (
      ![banner, listing, sidebar].every(
        (value) => Number.isFinite(value) && value > 0,
      )
    ) {
      toast.error("All spot prices must be greater than zero.");
      return;
    }

    execute({ banner, listing, sidebar });
  };

  return (
    <div className="rounded-sm border border-border">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Ad Spot Pricing</p>
          <Note>
            Update the per-day rate for each ad placement. The public booking
            flow uses these values immediately after save.
          </Note>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="shrink-0"
        >
          {isPending ? "Saving…" : "Save pricing"}
        </Button>
      </div>

      <div className="divide-y divide-border">
        {adsConfig.adSpots.map((spot) => (
          <div key={spot.type} className="flex items-center gap-4 px-5 py-4">
            <div className="w-36 shrink-0">
              <p className="text-sm font-medium">{spot.label}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                {spot.type}
              </p>
            </div>

            <div className="relative flex-1 max-w-[160px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={prices[spot.type]}
                onChange={(event) =>
                  setPrices((prev) => ({
                    ...prev,
                    [spot.type]: event.target.value,
                  }))
                }
                disabled={isPending}
                className="h-8 pl-6 text-sm tabular-nums"
                aria-label={`${spot.label} price per day`}
              />
            </div>

            <p className="text-xs text-muted-foreground whitespace-nowrap">
              / day
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
