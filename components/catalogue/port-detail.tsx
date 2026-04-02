import type { ComponentProps } from "react";
import Image from "next/image";
import { Card } from "~/components/common/card";
import { Link } from "~/components/common/link";
import { VerifiedBadge } from "~/components/web/verified-badge";
import type { PortOne } from "~/server/web/ports/payloads";

type PortDetailProps = {
  port: PortOne;
  canonicalUrl?: string;
  likeButton?: React.ReactNode;
  reportButton?: React.ReactNode;
};

const PortDetail = ({
  port,
  canonicalUrl,
  likeButton,
  reportButton,
}: PortDetailProps) => {
  const portTitle = port.name ?? `${port.theme.name} for ${port.platform.name}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex gap-x-3 gap-y-2 flex-row items-center place-content-start flex-wrap flex-1 min-w-0">
              <h1 className="font-display font-semibold text-2xl tracking-micro leading-tight md:text-3xl truncate">
                {portTitle}
              </h1>
              {port.isOfficial && <VerifiedBadge size="md" />}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {likeButton}
              {reportButton}
            </div>
          </div>

          {port.description && (
            <p className="mt-2 text-muted-foreground">{port.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {port.content && (
        <Card className="p-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {port.content}
          </div>
        </Card>
      )}

      {/* Screenshot */}
      {port.screenshotUrl && (
        <div>
          <Image
            src={port.screenshotUrl}
            alt={`Screenshot of ${port.name}`}
            width={1920}
            height={1080}
            className="h-auto w-full rounded-lg border"
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {port.theme && (
          <Link href={`/themes/${port.theme.slug}`}>
            Theme: {port.theme.name}
          </Link>
        )}
        {port.platform && (
          <Link href={`/platforms/${port.platform.slug}`}>
            Platform: {port.platform.name}
          </Link>
        )}
        {canonicalUrl && <Link href={canonicalUrl}>Canonical URL</Link>}
      </div>
    </div>
  );
};

export { PortDetail };
