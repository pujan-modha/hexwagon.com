import { PortStatus } from "@prisma/client"
import { NextResponse } from "next/server"
import { allPosts } from "~/.content-collections/generated"
import { siteConfig } from "~/config/site"
import { getToolSuffix } from "~/lib/tools"
import { db } from "~/services/db"

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

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  })
}
