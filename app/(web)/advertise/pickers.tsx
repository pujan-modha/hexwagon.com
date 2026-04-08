import { AdsPicker } from "~/components/web/ads-picker"
import { getAdPackagePricing } from "~/server/web/ads/queries"

export const AdvertisePickers = async () => {
  const packagePricing = await getAdPackagePricing()

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6">
      <AdsPicker packagePricing={packagePricing} className="mx-auto" />
    </div>
  )
}
