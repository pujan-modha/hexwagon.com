"use client";

import posthog, { type Properties } from "posthog-js";

type AnalyticsProperties = Properties;

type OpenPanelCommandFn = {
  (command: string, ...args: unknown[]): void;
  track?: (
    name: string,
    properties?: Record<string, string | number | boolean>,
  ) => void;
};

type AnalyticsEvent =
  | {
      event: "port_viewed";
      properties: { portId: string; themeSlug: string; platformSlug: string };
    }
  | {
      event: "port_liked";
      properties: { portId: string; themeSlug: string; platformSlug: string };
    }
  | {
      event: "theme_viewed";
      properties: { themeId: string; themeSlug: string };
    }
  | { event: "theme_liked"; properties: { themeSlug: string } }
  | {
      event: "platform_viewed";
      properties: { platformId: string; platformSlug: string };
    }
  | { event: "platform_liked"; properties: { platformSlug: string } }
  | {
      event: "search_performed";
      properties: { query: string; resultCount: number };
    }
  | {
      event: "port_submitted";
      properties: { themeSlug: string; platformSlug: string };
    }
  | {
      event: "suggestion_submitted";
      properties: { type: "Theme" | "Platform" };
    }
  | {
      event: "repo_link_clicked";
      properties: { portId: string; repositoryUrl: string };
    }
  | {
      event: "website_clicked";
      properties: {
        entityType: "theme" | "platform";
        entityId: string;
        entitySlug: string;
        url: string;
        source: "sidebar_button" | "sidebar_link";
      };
    }
  | {
      event: "repository_clicked";
      properties: {
        portId: string;
        themeSlug: string;
        platformSlug: string;
        repositoryUrl: string;
        source: "sidebar_button" | "details_card";
      };
    };

const toPrimitiveProps = (properties?: AnalyticsProperties) => {
  if (!properties) {
    return undefined;
  }

  const entries = Object.entries(properties)
    .filter(([, value]) => value !== undefined && value !== null)
    .filter(([, value]) => {
      const valueType = typeof value;
      return (
        valueType === "string" ||
        valueType === "number" ||
        valueType === "boolean"
      );
    });

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<
    string,
    string | number | boolean
  >;
};

export const trackRawEvent = (
  event: string,
  properties?: AnalyticsProperties,
) => {
  posthog.capture(event, properties);

  const primitiveProps = toPrimitiveProps(properties);

  if (typeof window !== "undefined") {
    const openPanel = (window as unknown as { op?: OpenPanelCommandFn }).op;

    if (typeof openPanel?.track === "function") {
      openPanel.track(event, primitiveProps);
      return;
    }

    if (typeof openPanel === "function") {
      openPanel("track", event, primitiveProps);
    }
  }
};

export const trackEvent = ({ event, properties }: AnalyticsEvent) => {
  trackRawEvent(event, properties);
};
