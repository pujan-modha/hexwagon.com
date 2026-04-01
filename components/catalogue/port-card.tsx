import type { ComponentProps } from "react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
} from "~/components/common/card";
import { H4 } from "~/components/common/heading";
import { Link } from "~/components/common/link";
import { Skeleton } from "~/components/common/skeleton";
import { VerifiedBadge } from "~/components/web/verified-badge";
import { Favicon } from "~/components/web/ui/favicon";
import type { PortMany } from "~/server/web/ports/payloads";

type PortCardProps = Omit<ComponentProps<typeof Card>, "href"> & {
  port: PortMany;
  href?: string;
};

const getPortHref = (port: PortMany) =>
  `/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`;

const PortCard = ({ port, href, className, ...props }: PortCardProps) => {
  return (
    <Card asChild className={className} {...props}>
      <Link href={href ?? getPortHref(port)}>
        <CardHeader>
          <H4 as="h3" className="inline-flex items-center gap-2 truncate">
            <span className="truncate">{port.name ?? port.theme.name}</span>
            {port.isOfficial ? (
              <VerifiedBadge size="sm" className="-mb-[0.1em]" />
            ) : null}
          </H4>
        </CardHeader>

        <CardDescription className="min-h-[3.75rem] line-clamp-3">
          {port.description || "\u00A0"}
        </CardDescription>

        <CardFooter className="mt-auto text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Favicon
              src={port.theme.faviconUrl}
              title={port.theme.name}
              plain
              className="size-4"
            />
            <span className="truncate">{port.theme.name}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Favicon
              src={port.platform.faviconUrl}
              title={port.platform.name}
              plain
              className="size-4"
            />
            <span className="truncate">{port.platform.name}</span>
          </span>
        </CardFooter>
      </Link>
    </Card>
  );
};

const PortCardSkeleton = () => {
  return (
    <Card hover={false} className="items-stretch select-none">
      <CardHeader>
        <H4 className="w-2/3">
          <Skeleton>&nbsp;</Skeleton>
        </H4>
      </CardHeader>

      <CardDescription className="flex flex-col gap-0.5">
        <Skeleton className="h-5 w-4/5">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-3/4">&nbsp;</Skeleton>
        <Skeleton className="h-5 w-1/2">&nbsp;</Skeleton>
      </CardDescription>

      <CardFooter>
        <Skeleton className="h-4 w-1/3">&nbsp;</Skeleton>
      </CardFooter>
    </Card>
  );
};

export { PortCard, PortCardSkeleton };
