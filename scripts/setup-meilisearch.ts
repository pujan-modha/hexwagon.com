import { config } from "~/config"
import { indexPlatforms, indexPorts, indexThemes } from "~/lib/indexing"
import { meili } from "~/services/meilisearch"

const siteSlug = config.site.slug

const indexes = [
  {
    name: "ports",
    primaryKey: "id",
    settings: {
      searchableAttributes: ["name", "description", "theme", "platform", "tags"],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
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
      searchableAttributes: ["name", "description"],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
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
      searchableAttributes: ["name", "description"],
      displayedAttributes: [
        "id",
        "name",
        "slug",
        "description",
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
