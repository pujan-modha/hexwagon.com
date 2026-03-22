/**
 * URL builder utilities for theme/platform/port routes
 */

export const themeHref = (slug: string) => `/themes/${slug}`

export const themePlatformHref = (themeSlug: string, platformSlug: string) =>
  `/themes/${themeSlug}/${platformSlug}`

export const portHrefFromTheme = (
  themeSlug: string,
  platformSlug: string,
  portId: string,
) => `/themes/${themeSlug}/${platformSlug}/${portId}`

export const platformHref = (slug: string) => `/platforms/${slug}`

export const platformThemeHref = (platformSlug: string, themeSlug: string) =>
  `/platforms/${platformSlug}/${themeSlug}`

export const portHrefFromPlatform = (
  platformSlug: string,
  themeSlug: string,
  portId: string,
) => `/platforms/${platformSlug}/${themeSlug}/${portId}`

export const canonicalPortHref = (
  themeSlug: string,
  platformSlug: string,
  portId: string,
) => portHrefFromTheme(themeSlug, platformSlug, portId)
