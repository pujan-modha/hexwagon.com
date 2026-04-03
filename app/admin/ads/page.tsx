import { AdFixedSlotOverrideManager } from "~/components/admin/ad-fixed-slot-override-manager";
import { AdPackagePricingManager } from "~/components/admin/ad-package-pricing-manager";
import { withAdminPage } from "~/components/admin/auth-hoc";
import { Wrapper } from "~/components/admin/wrapper";
import {
  findAds,
  findFixedSlotCandidates,
  findFixedSlotOverrides,
} from "~/server/admin/ads/queries";
import { getAdPackagePricing } from "~/server/web/ads/queries";
import { AdsTable } from "./_components/ads-table";
import { CreateAdButton } from "./_components/create-ad-button";

const AdsPage = async () => {
  const [ads, packagePricing, fixedOverrides, fixedCandidates] =
    await Promise.all([
      findAds({}),
      getAdPackagePricing(),
      findFixedSlotOverrides(),
      findFixedSlotCandidates(),
    ]);

  return (
    <Wrapper size="lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Ads</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Review bookings, manage package pricing, and create direct deals
              without leaving the dashboard.
            </p>
          </div>

          <CreateAdButton />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AdPackagePricingManager initialPricing={packagePricing} />
          <AdFixedSlotOverrideManager
            overrides={fixedOverrides}
            candidates={fixedCandidates}
          />
        </div>

        <AdsTable ads={ads} />
      </div>
    </Wrapper>
  );
};

export default withAdminPage(AdsPage);
