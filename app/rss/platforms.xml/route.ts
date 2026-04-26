import { getUrlHostname } from "@primoui/utils"
import { PortStatus } from "@prisma/client"
import RSS from "rss"
import { config } from "~/config"
import { db } from "~/services/db"
import { addSearchParams } from "~/utils/search-params"

const RSS_CACHE_SECONDS = 60 * 60 * 4
const RSS_STALE_SECONDS = 60 * 60 * 24
const RSS_CACHE_CONTROL = `public, max-age=0, s-maxage=${RSS_CACHE_SECONDS}, stale-while-revalidate=${RSS_STALE_SECONDS}`

export const dynamic = "force-static"
export const revalidate = 14400

export const GET = async () => {
  const { url, name, tagline } = config.site
  const rssSearchParams = {
    utm_source: getUrlHostname(url),
    utm_medium: "rss",
  }

  const platforms = await db.platform.findMany({
    where: { ports: { some: { status: PortStatus.Published } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
    },
  })

  const feed = new RSS({
    title: name,
    description: tagline,
    site_url: addSearchParams(`${url}/platforms`, rssSearchParams),
    feed_url: `${url}/rss/platforms.xml`,
    copyright: `${new Date().getFullYear()} ${name}`,
    language: "en",
    ttl: 14400,
    pubDate: new Date(),
  })

  platforms.map(platform => {
    feed.item({
      guid: platform.id,
      title: platform.name,
      url: addSearchParams(`${url}/platforms/${platform.slug}`, rssSearchParams),
      date: platform.createdAt.toUTCString(),
      description: platform.description ?? "",
    })
  })

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/xml",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": RSS_CACHE_CONTROL,
    },
  })
}
