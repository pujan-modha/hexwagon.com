import { config } from "~/config"
import { findAllocatedSlotAd } from "~/server/web/ads/queries"
import { FloatingFooterAdCard } from "./ad-floating-footer-client"
import { PersistentAdRegistration } from "./persistent-ads-provider"

type AdFloatingFooterProps = {
  className?: string
  allocationScope?: string
  context?: {
    themeId?: string
    platformId?: string
  }
}

export const AdFloatingFooter = async ({
  className,
  allocationScope,
  context,
}: AdFloatingFooterProps) => {
  const ad =
    (await findAllocatedSlotAd({
      slot: "Footer",
      scope: allocationScope,
      context,
    })) ?? config.ads.defaultAd

  return (
    <>
      <PersistentAdRegistration slot="Footer" adId={ad.id} />
      <FloatingFooterAdCard ad={ad} className={className} />
    </>
  )
}
