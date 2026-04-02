import type { Prisma } from "@prisma/client";
import type { ComponentProps } from "react";
import { Badge } from "~/components/common/badge";
import { Button } from "~/components/common/button";
import {
  Card,
  CardBadges,
  CardDescription,
  CardHeader,
  type CardProps,
} from "~/components/common/card";
import { H4 } from "~/components/common/heading";
import { Skeleton } from "~/components/common/skeleton";
import { Favicon } from "~/components/web/ui/favicon";
import { config } from "~/config";
import type { AdOne } from "~/server/web/ads/payloads";
import { findAd } from "~/server/web/ads/queries";
import { cx } from "~/utils/cva";
import { AdPreviewCard } from "./ad-preview";

type AdCardProps = CardProps & {
  // Database query conditions to find a specific ad
  where?: Prisma.AdWhereInput;
  // Override ad data without database query
  overrideAd?: AdOne | null;
  // Default values to merge with the fallback ad
  defaultOverride?: Partial<AdOne>;
};

const AdCard = async ({
  className,
  where,
  overrideAd,
  defaultOverride,
  ...props
}: AdCardProps) => {
  // Default ad values to display if no ad is found
  const defaultAd = { ...config.ads.defaultAd, ...defaultOverride };

  // Resolve the ad data from the override or database (don't query if override is defined)
  const resolvedAd =
    overrideAd !== undefined ? overrideAd : await findAd({ where });

  // Final ad data to display
  const ad = resolvedAd ?? defaultAd;

  return <AdPreviewCard className={className} ad={ad} interactive {...props} />;
};

const AdCardSkeleton = ({
  className,
  ...props
}: ComponentProps<typeof Card>) => {
  return (
    <Card
      hover={false}
      className={cx(
        "h-[190px] min-h-[190px] items-stretch select-none",
        className,
      )}
      {...props}
    >
      <CardBadges>
        <Badge variant="outline">Ad</Badge>
      </CardBadges>

      <CardHeader>
        <Favicon src="/favicon.png" className="animate-pulse opacity-50" />

        <H4 className="w-2/3">
          <Skeleton>&nbsp;</Skeleton>
        </H4>
      </CardHeader>

      <CardDescription className="flex flex-col gap-0.5 mb-auto">
        <Skeleton className="h-5 w-full">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-2/3">&nbsp;</Skeleton>
      </CardDescription>

      <Button
        className="pointer-events-none opacity-10 text-transparent md:w-full"
        asChild
      >
        <span>&nbsp;</span>
      </Button>
    </Card>
  );
};

export { AdCard, AdCardSkeleton };
