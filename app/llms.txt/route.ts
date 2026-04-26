import { ConfigStatus, PortStatus } from "@prisma/client"
import { NextResponse } from "next/server"
import { allPosts } from "~/.content-collections/generated"
import { siteConfig } from "~/config/site"
import { getToolSuffix } from "~/lib/tools"
import { db } from "~/services/db"
import { tryCatch } from "~/utils/helpers"

const LLMSTXT_CACHE_SECONDS = 60 * 30
const LLMSTXT_STALE_SECONDS = 60 * 60 * 24
const LLMSTXT_CACHE_CONTROL = `public, max-age=0, s-maxage=${LLMSTXT_CACHE_SECONDS}, stale-while-revalidate=${LLMSTXT_STALE_SECONDS}`

export const dynamic = "force-static"
export const revalidate = 1800

export const GET = async () => {
  const tools = await db.port.findMany({
    where: { status: PortStatus.Published },
    orderBy: { pageviews: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      theme: { select: { name: true, slug: true } },
      platform: { select: { name: true, slug: true } },
    },
  })
  const configResult = await tryCatch(
    db.config.findMany({
      where: { status: ConfigStatus.Published },
      orderBy: [{ pageviews: "desc" }, { createdAt: "desc" }],
      select: {
        name: true,
        slug: true,
      },
      take: 100,
    }),
  )
  const configs = configResult.data ?? []

  let content = `# ${siteConfig.name} - ${siteConfig.tagline}
${siteConfig.description}\n
## Blog Highlights
Links to our most popular blog posts.\n
${allPosts.map(post => `- [${post.title}](${siteConfig.url}/blog/${post._meta.path})`).join("\n")}\n
## Theme ports\n`

  for (const tool of tools) {
    const canonicalUrl = `${siteConfig.url}/themes/${tool.theme.slug}/${tool.platform.slug}/${tool.id}`
    content += `- [${tool.name}](${canonicalUrl}): ${getToolSuffix(tool)}\n`
  }

  content += "\n## Configs and Dotfiles\n"

  for (const config of configs) {
    content += `- [${config.name}](${siteConfig.url}/configs/${config.slug})\n`
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": LLMSTXT_CACHE_CONTROL,
    },
  })
}
