"use client";

import { getUrlHostname, isExternalUrl } from "@primoui/utils";
import { type Properties } from "posthog-js";
import type { ComponentProps } from "react";
import { siteConfig } from "~/config/site";
import { trackRawEvent } from "~/hooks/use-analytics";
import { addSearchParams } from "~/utils/search-params";

type ExternalLinkProps = ComponentProps<"a"> & {
  doTrack?: boolean;
  doFollow?: boolean;
  eventName?: string;
  eventProps?: Properties;
};

export const ExternalLink = ({
  href,
  target = "_blank",
  doTrack = true,
  doFollow = false,
  eventName,
  eventProps,
  onClick,
  ...props
}: ExternalLinkProps) => {
  const hostname = getUrlHostname(siteConfig.url);
  const addTracking = doTrack && !href?.includes("utm_");
  const finalHref = addTracking
    ? addSearchParams(href!, { utm_source: hostname })
    : href;
  const isExternal = isExternalUrl(finalHref);

  return (
    <a
      href={finalHref!}
      target={target}
      rel={`noopener${doFollow ? "" : " nofollow"}`}
      onClick={(event) => {
        onClick?.(event);
        if (isExternal && eventName) {
          trackRawEvent(eventName, eventProps);
        }
      }}
      {...props}
    />
  );
};
