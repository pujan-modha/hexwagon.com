"use client";

import * as React from "react";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { Button } from "~/components/common/button";
import { Input } from "~/components/common/input";
import { Label } from "~/components/common/label";
import { Note } from "~/components/common/note";
import { updateAdPackagePricing } from "~/server/admin/ads/actions";
import type { AdPackagePricingSettings } from "~/server/web/ads/queries";

type AdPackagePricingManagerProps = {
  initialPricing: AdPackagePricingSettings;
};

const centsToDollars = (priceCents: number) => (priceCents / 100).toFixed(2);

export const AdPackagePricingManager = ({
  initialPricing,
}: AdPackagePricingManagerProps) => {
  const inputIds = {
    weeklyBasePrice: "weekly-base-price",
    weeklyDiscountedPrice: "weekly-discounted-price",
    weeklyTargetUnitPrice: "weekly-target-unit-price",
    monthlyBasePrice: "monthly-base-price",
    monthlyDiscountedPrice: "monthly-discounted-price",
    monthlyTargetUnitPrice: "monthly-target-unit-price",
  };

  const [values, setValues] = React.useState({
    weeklyBasePrice: centsToDollars(initialPricing.weekly.basePriceCents),
    weeklyDiscountedPrice: centsToDollars(
      initialPricing.weekly.discountedPriceCents,
    ),
    monthlyBasePrice: centsToDollars(initialPricing.monthly.basePriceCents),
    monthlyDiscountedPrice: centsToDollars(
      initialPricing.monthly.discountedPriceCents,
    ),
    weeklyTargetUnitPrice: centsToDollars(
      initialPricing.weekly.targetUnitPriceCents,
    ),
    monthlyTargetUnitPrice: centsToDollars(
      initialPricing.monthly.targetUnitPriceCents,
    ),
  });

  const { execute, isPending } = useServerAction(updateAdPackagePricing, {
    onSuccess: () => toast.success("Package pricing updated."),
    onError: ({ err }) => toast.error(err.message),
  });

  const handleSave = () => {
    const parsed = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, Number(value)]),
    ) as Record<keyof typeof values, number>;

    const allFinite = Object.values(parsed).every(
      (value) => Number.isFinite(value) && value >= 0,
    );

    if (!allFinite) {
      toast.error("All package pricing values must be zero or more.");
      return;
    }

    if (parsed.weeklyDiscountedPrice > parsed.weeklyBasePrice) {
      toast.error(
        "Weekly discounted price cannot be greater than weekly base price.",
      );
      return;
    }

    if (parsed.monthlyDiscountedPrice > parsed.monthlyBasePrice) {
      toast.error(
        "Monthly discounted price cannot be greater than monthly base price.",
      );
      return;
    }

    execute(parsed);
  };

  return (
    <div className="rounded-sm border border-border">
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Package Pricing</p>
          <Note>
            Configure weekly and monthly package prices, including per-target
            add-on fees.
          </Note>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="shrink-0"
        >
          {isPending ? "Saving..." : "Save pricing"}
        </Button>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Weekly
          </p>

          <div className="grid gap-1.5">
            <Label
              htmlFor={inputIds.weeklyBasePrice}
              className="text-xs text-muted-foreground"
            >
              Base price
            </Label>
            <Input
              id={inputIds.weeklyBasePrice}
              type="number"
              step="0.01"
              min="0"
              value={values.weeklyBasePrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  weeklyBasePrice: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor={inputIds.weeklyDiscountedPrice}
              className="text-xs text-muted-foreground"
            >
              Discounted price
            </Label>
            <Input
              id={inputIds.weeklyDiscountedPrice}
              type="number"
              step="0.01"
              min="0"
              value={values.weeklyDiscountedPrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  weeklyDiscountedPrice: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor={inputIds.weeklyTargetUnitPrice}
              className="text-xs text-muted-foreground"
            >
              Per target fee
            </Label>
            <Input
              id={inputIds.weeklyTargetUnitPrice}
              type="number"
              step="0.01"
              min="0"
              value={values.weeklyTargetUnitPrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  weeklyTargetUnitPrice: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Monthly
          </p>

          <div className="grid gap-1.5">
            <Label
              htmlFor={inputIds.monthlyBasePrice}
              className="text-xs text-muted-foreground"
            >
              Base price
            </Label>
            <Input
              id={inputIds.monthlyBasePrice}
              type="number"
              step="0.01"
              min="0"
              value={values.monthlyBasePrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  monthlyBasePrice: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor={inputIds.monthlyDiscountedPrice}
              className="text-xs text-muted-foreground"
            >
              Discounted price
            </Label>
            <Input
              id={inputIds.monthlyDiscountedPrice}
              type="number"
              step="0.01"
              min="0"
              value={values.monthlyDiscountedPrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  monthlyDiscountedPrice: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor={inputIds.monthlyTargetUnitPrice}
              className="text-xs text-muted-foreground"
            >
              Per target fee
            </Label>
            <Input
              id={inputIds.monthlyTargetUnitPrice}
              type="number"
              step="0.01"
              min="0"
              value={values.monthlyTargetUnitPrice}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  monthlyTargetUnitPrice: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
