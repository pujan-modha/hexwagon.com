import posthog from "posthog-js"

type AnalyticsEvent =
  | { event: "port_viewed"; properties: { portId: string; themeSlug: string; platformSlug: string } }
  | { event: "port_liked"; properties: { portId: string; themeSlug: string; platformSlug: string } }
  | { event: "theme_viewed"; properties: { themeSlug: string } }
  | { event: "theme_liked"; properties: { themeSlug: string } }
  | { event: "platform_viewed"; properties: { platformSlug: string } }
  | { event: "platform_liked"; properties: { platformSlug: string } }
  | { event: "search_performed"; properties: { query: string; resultCount: number } }
  | { event: "port_submitted"; properties: { themeSlug: string; platformSlug: string } }
  | { event: "suggestion_submitted"; properties: { type: "Theme" | "Platform" } }
  | { event: "install_link_clicked"; properties: { portId: string; installUrl: string } }
  | { event: "repo_link_clicked"; properties: { portId: string; repositoryUrl: string } }

export const trackEvent = ({ event, properties }: AnalyticsEvent) => {
  posthog.capture(event, properties)
}
