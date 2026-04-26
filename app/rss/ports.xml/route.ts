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

  const ports = await db.port.findMany({
    where: { status: PortStatus.Published },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      publishedAt: true,
      theme: { select: { slug: true } },
      platform: { select: { name: true, slug: true } },
    },
  })

  const feed = new RSS({
    title: name,
    description: tagline,
    site_url: addSearchParams(url, rssSearchParams),
    feed_url: `${url}/rss/ports.xml`,
    copyright: `${new Date().getFullYear()} ${name}`,
    language: "en",
    ttl: 14400,
    pubDate: new Date(),
  })

  ports.map(port => {
    const canonicalUrl = `${url}/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`

    feed.item({
      guid: port.id,
      title: port.name ?? port.slug,
      url: addSearchParams(canonicalUrl, rssSearchParams),
      date: port.publishedAt?.toUTCString() ?? new Date().toUTCString(),
      description: port.description ?? "",
      categories: port.platform ? [port.platform.name] : [],
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
