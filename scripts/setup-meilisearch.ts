import { config } from "~/config"
import { indexConfigs, indexPlatforms, indexPorts, indexThemes } from "~/lib/indexing"
import { meili } from "~/services/meilisearch"

const siteSlug = config.site.slug

const indexes = [
  {
    name: "ports",
    primaryKey: "id",
    settings: {
      searchableAttributes: [
        "name",
        "description",
        "searchAliases",
        "searchTerms",
        "theme",
        "platform",
        "tags",
      ],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
        "searchAliases",
        "searchTerms",
        "websiteUrl",
        "repositoryUrl",
        "faviconUrl",
        "isFeatured",
        "score",
        "pageviews",
        "status",
        "theme",
        "themeSlug",
        "platform",
        "platformSlug",
        "tags",
      ],
      filterableAttributes: ["status", "isFeatured", "themeSlug", "platformSlug", "tags"],
      sortableAttributes: ["score", "pageviews", "isFeatured"],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
        "isFeatured:desc",
        "score:desc",
        "pageviews:desc",
      ],
    },
  },
  {
    name: "themes",
    primaryKey: "id",
    settings: {
      searchableAttributes: ["name", "description", "searchAliases", "searchTerms"],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
        "searchAliases",
        "searchTerms",
        "websiteUrl",
        "faviconUrl",
        "isVerified",
        "portsCount",
        "pageviews",
      ],
      filterableAttributes: ["isVerified"],
      sortableAttributes: ["pageviews", "portsCount", "isVerified"],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
        "isVerified:desc",
        "portsCount:desc",
        "pageviews:desc",
      ],
    },
  },
  {
    name: "platforms",
    primaryKey: "id",
    settings: {
      searchableAttributes: ["name", "description", "searchAliases", "searchTerms"],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
        "searchAliases",
        "searchTerms",
        "websiteUrl",
        "faviconUrl",
        "isVerified",
        "portsCount",
        "pageviews",
      ],
      filterableAttributes: ["isVerified"],
      sortableAttributes: ["pageviews", "portsCount", "isVerified"],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
        "isVerified:desc",
        "portsCount:desc",
        "pageviews:desc",
      ],
    },
  },
  {
    name: "configs",
    primaryKey: "id",
    settings: {
      searchableAttributes: [
        "name",
        "description",
        "searchAliases",
        "searchTerms",
        "fontNames",
        "themeNames",
        "platformNames",
      ],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
        "searchAliases",
        "searchTerms",
        "repositoryUrl",
        "websiteUrl",
        "faviconUrl",
        "screenshotUrl",
        "isFeatured",
        "pageviews",
        "status",
        "themesCount",
        "platformsCount",
        "fontNames",
        "themeNames",
        "themeSlugs",
        "platformNames",
        "platformSlugs",
      ],
      filterableAttributes: ["status", "isFeatured", "themeSlugs", "platformSlugs"],
      sortableAttributes: ["pageviews", "isFeatured", "themesCount", "platformsCount"],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
        "isFeatured:desc",
        "pageviews:desc",
        "platformsCount:desc",
        "themesCount:desc",
      ],
    },
  },
]

async function ensureIndexes() {
  for (const idx of indexes) {
    const indexUid = `${siteSlug}-${idx.name}`

    try {
      await meili.getIndex(indexUid)
    } catch (e: any) {
      if (e.code !== "index_not_found" && !e.message?.includes("not found")) throw e

      await meili.createIndex(indexUid, { primaryKey: idx.primaryKey })
      console.log(`Created index: ${indexUid}`)
    }

    await meili.index(indexUid).updateSettings(idx.settings)
    console.log(`Configured index: ${indexUid}`)
  }
}

async function reindexAll() {
  await Promise.all([
    indexPorts({ replace: true }),
    indexThemes({ replace: true }),
    indexPlatforms({ replace: true }),
    indexConfigs({ replace: true }),
  ])
  console.log("Reindexing complete.")
}

async function main() {
  await ensureIndexes()
  await reindexAll()
  console.log("MeiliSearch setup and population complete.")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
