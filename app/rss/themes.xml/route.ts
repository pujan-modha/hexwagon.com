import { getUrlHostname } from "@primoui/utils"
import { PortStatus } from "@prisma/client"
import RSS from "rss"
import { config } from "~/config"
import { db } from "~/services/db"
import { addSearchParams } from "~/utils/search-params"

export const GET = async () => {
  const { url, name, tagline } = config.site
  const rssSearchParams = { utm_source: getUrlHostname(url), utm_medium: "rss" }

  const themes = await db.theme.findMany({
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
    site_url: addSearchParams(`${url}/themes`, rssSearchParams),
    feed_url: `${url}/rss/themes.xml`,
    copyright: `${new Date().getFullYear()} ${name}`,
    language: "en",
    ttl: 14400,
    pubDate: new Date(),
  })

  themes.map(theme => {
    feed.item({
      guid: theme.id,
      title: theme.name,
      url: addSearchParams(`${url}/themes/${theme.slug}`, rssSearchParams),
      date: theme.createdAt.toUTCString(),
      description: theme.description ?? "",
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
