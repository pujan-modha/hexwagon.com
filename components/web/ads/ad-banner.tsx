import type { ComponentProps } from "react"
import type { Card } from "~/components/common/card"
import { Container } from "~/components/web/ui/container"
import { config } from "~/config"
import { findAllocatedSlotAd } from "~/server/web/ads/queries"
import { AdPreviewBanner } from "./ad-preview"
import { PersistentAdRegistration } from "./persistent-ads-provider"

type AdBannerProps = ComponentProps<typeof Card> & {
  allocationScope?: string
  context?: {
    themeId?: string
    platformId?: string
  }
}

export const AdBanner = async ({
  className,
  allocationScope,
  context,
  ...props
}: AdBannerProps) => {
  const ad =
    (await findAllocatedSlotAd({
      slot: "Banner",
      scope: allocationScope,
      context,
    })) ?? config.ads.defaultAd

  return (
    <>
      <PersistentAdRegistration slot="Banner" adId={ad.id} />
      <Container className="z-49 mt-1">
        <AdPreviewBanner ad={ad} interactive className={className} {...props} />
      </Container>
    </>
  )
}
