import type { ComponentProps } from "react";
import { AdType } from "@prisma/client";
import { Card } from "~/components/common/card";
import { Container } from "~/components/web/ui/container";
import { config } from "~/config";
import { findAd } from "~/server/web/ads/queries";
import { AdPreviewBanner } from "./ad-preview";

export const AdBanner = async ({
  className,
  ...props
}: ComponentProps<typeof Card>) => {
  const ad =
    (await findAd({ where: { type: AdType.Banner } })) ?? config.ads.defaultAd;

  return (
    <Container className="z-49 mt-1">
      <AdPreviewBanner ad={ad} interactive className={className} {...props} />
    </Container>
  );
};
