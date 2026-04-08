# Analytics Event Map

This document is the source of truth for analytics event naming and payload shape in this repo.

Use this guide before adding or changing tracking.

## Tracking Stack

- PostHog:
  - Base pageview: `$pageview` on route changes.
  - Custom events: all feature events.
- OpenPanel:
  - Base pageview: auto `screenView` via `OpenPanelComponent`.
  - Custom events: mirrored from `trackRawEvent`.

Primary wiring:

- `app/(web)/providers.tsx`
- `components/web/posthog-pageview.tsx`
- `app/api/op/[...op]/route.ts`
- `hooks/use-analytics.ts`
- `components/web/external-link.tsx`

## Naming Rules

1. Use `snake_case` event names.
2. Use `click_*` for outbound link interactions.
3. Include `source` in click events when multiple UI placements exist.
4. Include stable identifiers (`id`, `slug`) over display names.
5. Do not invent near-duplicate names (for example, `website_clicked` vs `click_website`).

## Canonical Events

### Page Views

| Event             | Transport           | Required Props                        | Emitted From                                                                                                   |
| ----------------- | ------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `$pageview`       | PostHog             | `$current_url`                        | `components/web/posthog-pageview.tsx`                                                                          |
| `theme_viewed`    | PostHog + OpenPanel | `themeId`, `themeSlug`                | `app/(web)/themes/[slug]/page.tsx`                                                                             |
| `platform_viewed` | PostHog + OpenPanel | `platformId`, `platformSlug`          | `app/(web)/platforms/[slug]/page.tsx`                                                                          |
| `port_viewed`     | PostHog + OpenPanel | `portId`, `themeSlug`, `platformSlug` | `app/(web)/themes/[slug]/[platform]/[portId]/page.tsx`, `app/(web)/platforms/[slug]/[theme]/[portId]/page.tsx` |

### Click Events

| Event              | Transport           | Required Props                                                   | Emitted From                                            |
| ------------------ | ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `click_website`    | PostHog + OpenPanel | `entityType`, `entityId`, `entitySlug`, `url`, `source`          | theme/platform sidebar website link + button            |
| `click_repository` | PostHog + OpenPanel | `portId`, `themeSlug`, `platformSlug`, `repositoryUrl`, `source` | port sidebar repository button, repository details card |
| `click_ad`         | PostHog + OpenPanel | `url`, `type`, `source`                                          | ad card/banner/button                                   |
| `click_share`      | PostHog + OpenPanel | `url`, `platform`                                                | share buttons                                           |

### Search, Subscription, Commerce

| Event                   | Transport            | Required Props                                                                 | Emitted From                                            |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `search`                | PostHog              | `query`                                                                        | command/search dialog                                   |
| `search_meili_fallback` | PostHog + Server Log | `source`, `queryLength`, `fallbackIndexes`, `fallbackReasons`, `meiliFailures` | hero search, command/search dialog, `actions/search.ts` |
| `subscribe_newsletter`  | PostHog              | `email`                                                                        | newsletter form                                         |
| `ad_booking_started`    | PostHog              | `billingCycle`, `targetCount`, `totalPrice`                                    | ads checkout flows                                      |

## Deprecated / Legacy Names

Do not use these for new work:

- `website_clicked`
- `repository_clicked`
- `repo_link_clicked`
- `search_performed`

If encountered, migrate to canonical names in this file.

## Implementation Patterns

### For typed domain events

Use `trackEvent` in `hooks/use-analytics.ts`.

### For outbound links

Use `ExternalLink` with:

- `eventName`
- `eventProps`

`ExternalLink` handles:

- UTM appending
- PostHog capture
- OpenPanel custom event mirror

### For internal links

Use `Link` (no click analytics by default). If tracking is needed, call `trackRawEvent` in click handlers.

## Contributor Checklist

Before merging tracking changes:

1. Event name is already in this map, or you added it here.
2. Props are stable and documented.
3. `source` is included for click events with multiple placements.
4. No duplicate synonym event names were introduced.
5. Build succeeds: `bun run build`.
