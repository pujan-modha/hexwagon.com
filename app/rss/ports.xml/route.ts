import { getUrlHostname } from "@primoui/utils"
import { PortStatus } from "@prisma/client"
import RSS from "rss"
import { config } from "~/config"
import { db } from "~/services/db"
import { addSearchParams } from "~/utils/search-params"

export const GET = async () => {
  const { url, name, tagline } = config.site
  const rssSearchParams = { utm_source: getUrlHostname(url), utm_medium: "rss" }

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
      platform: { select: { name: true } },
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
    feed.item({
      guid: port.id,
      title: port.name ?? port.slug,
      url: addSearchParams(`${url}/${port.slug}`, rssSearchParams),
      date: port.publishedAt?.toUTCString() ?? new Date().toUTCString(),
      description: port.description ?? "",
      categories: port.platform ? [port.platform.name] : [],
    })
  })

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/xml",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=14400",
    },
  })
}
