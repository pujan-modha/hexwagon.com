import { withAdminPage } from "~/components/admin/auth-hoc";
import { AdDiscountManager } from "~/components/admin/ad-discount-manager";
import { AdPricingManager } from "~/components/admin/ad-pricing-manager";
import { Wrapper } from "~/components/admin/wrapper";
import { findAds } from "~/server/admin/ads/queries";
import { getAdPricing, getAdSettings } from "~/server/web/ads/queries";
import { AdsTable } from "./_components/ads-table";
import { CreateAdButton } from "./_components/create-ad-button";

const AdsPage = async () => {
  const [ads, pricing, settings] = await Promise.all([
    findAds({}),
    getAdPricing(),
    getAdSettings(),
  ]);

  return (
    <Wrapper size="lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Ads</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review bookings, tune pricing, and create direct deals without
              leaving the dashboard.
            </p>
          </div>

          <CreateAdButton pricing={pricing} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AdPricingManager initialPricing={pricing} />
          <AdDiscountManager
            initialMaxDiscountPercentage={settings.maxDiscountPercentage}
            initialTargetingUnitPrice={settings.targetingUnitPrice}
          />
        </div>

        <AdsTable ads={ads} pricing={pricing} />
      </div>
    </Wrapper>
  );
};

export default withAdminPage(AdsPage);
