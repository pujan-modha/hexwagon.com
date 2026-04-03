import { AdsPicker } from "~/components/web/ads-picker";
import { adsConfig } from "~/config/ads";
import {
  findAdsForBooking,
  getAdPricing,
  getAdSettings,
} from "~/server/web/ads/queries";
export const AdvertisePickers = async () => {
  const [ads, pricing, settings] = await Promise.all([
    findAdsForBooking(),
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
