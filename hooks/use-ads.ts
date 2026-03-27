"use client";

import type { AdType } from "@prisma/client";
import { useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { adsConfig, type AdSpot } from "~/config/ads";
import { calculateAdsPrice, defaultMaxAdDiscountPercentage } from "~/utils/ads";

export type AdsPicker = {
  label: string;
  type: AdType;
  description: string;
  price: number;
};

export type AdsSelection = {
  type: AdType;
  dateRange?: DateRange;
  duration?: number;
};

export const useAds = (
  adSpots: AdSpot[] = adsConfig.adSpots,
  maxDiscountPercentage = defaultMaxAdDiscountPercentage,
) => {
  const [selections, setSelections] = useState<AdsSelection[]>([]);
  const spots = adSpots;

  const findAdSpot = useCallback(
    (type: AdType) => {
      return spots.find((s) => s.type === type) ?? spots[0];
    },
    [spots],
  );

  const clearSelection = useCallback((type: AdType) => {
    setSelections((prev) => prev.filter((s) => s.type !== type));
  }, []);

  const updateSelection = useCallback(
    (type: AdType, selection: Partial<Omit<AdsSelection, "type">>) => {
      setSelections((prev) => {
        const existing = prev.find((s) => s.type === type);
        if (!existing) {
          return [...prev, { type, ...selection }];
        }

        return prev.map((s) => (s.type === type ? { ...s, ...selection } : s));
      });
    },
    [],
  );

  const hasSelections = useMemo(() => {
    return selections.some((s) => s.duration && s.duration > 0);
  }, [selections]);

  const price = useMemo(() => {
    const selectedItems = selections
      .filter((s) => s.duration && s.duration > 0)
      .map((selection) => ({
        price: findAdSpot(selection.type).price,
        duration: selection.duration,
      }));

    if (selectedItems.length === 0) return null;

    const basePrice = Math.min(...spots.map((s) => s.price));
    return calculateAdsPrice(selectedItems, basePrice, maxDiscountPercentage);
  }, [selections, spots, maxDiscountPercentage]);

  return {
    price,
    selections,
    hasSelections,
    findAdSpot,
    clearSelection,
    updateSelection,
  };
};
