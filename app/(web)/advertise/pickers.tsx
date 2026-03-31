import { Stack } from "~/components/common/stack";
import { AdsPicker } from "~/components/web/ads-picker";
import { AdsPickerThemes } from "~/components/web/ads-picker-alternatives";
import { ExternalLink } from "~/components/web/external-link";
import { adsConfig } from "~/config/ads";
import { findAds, getAdPricing, getAdSettings } from "~/server/web/ads/queries";
import { findRelatedThemeIds } from "~/server/web/themes/queries";

import { findThemes } from "~/server/web/themes/queries";

type AdvertisePickersProps = {
  theme: string | null;
};

export const AdvertisePickers = async ({ theme }: AdvertisePickersProps) => {
  if (theme !== null) {
    const themes = await findThemes({
      where: {
        pageviews: { gte: adsConfig.minPageviewThreshold },
        ad: null,
      },
      orderBy: { pageviews: "desc" },
    });

    const relatedIds = theme
      ? await findRelatedThemeIds({
          id: theme,
          limit: 10,
          rankingScoreThreshold: 0.5,
          filter: `id IN [${themes.map((a) => a.id).join(",")}]`,
        })
      : [];

    return (
      <AdsPickerThemes
        themes={themes}
        selectedId={theme}
        relatedIds={relatedIds}
      />
    );
  }

  const [ads, pricing, settings] = await Promise.all([
    findAds({}),
    getAdPricing(),
    getAdSettings(),
  ]);

  const adSpots = adsConfig.adSpots.map((spot) => ({
    ...spot,
    price: pricing[spot.type],
  }));

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6">
      <AdsPicker
        ads={ads}
        adSpots={adSpots}
        maxDiscountPercentage={settings.maxDiscountPercentage}
        className="mx-auto"
      />
    </div>
  );
};
