"use server"

import { createServerAction } from "zsa"
import { findLicenses } from "~/server/web/licenses/queries"
import { findPlatforms } from "~/server/web/platforms/queries"
import { findTags } from "~/server/web/tags/queries"
import { findThemes } from "~/server/web/themes/queries"

export const findFilterOptions = createServerAction().handler(async () => {
  const [themes, platforms, tags, licenses] = await Promise.all([
    findThemes({}),
    findPlatforms({}),
    findTags({}),
    findLicenses({}),
  ])

  const themeOptions = themes.map(({ slug, name }) => ({ slug, name, count: 0 }))
  const platformOptions = platforms.map(({ slug, name }) => ({ slug, name, count: 0 }))
  const tagOptions = tags.map(({ slug }) => ({ slug, name: slug, count: 0 }))
  const licenseOptions = licenses.map(({ slug, name }) => ({ slug, name, count: 0 }))

  return { theme: themeOptions, platform: platformOptions, tag: tagOptions, license: licenseOptions } as const
})
