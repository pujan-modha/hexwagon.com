import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Section } from "~/components/web/ui/section"
import { metadataConfig } from "~/config/metadata"
import { findPlatform } from "~/server/web/platforms/queries"
import { findTheme } from "~/server/web/themes/queries"
import { findPort } from "~/server/web/ports/queries"
import { findCommentsByPort } from "~/server/web/comments/queries"
import { PortDetail } from "~/components/catalogue/port-detail"
import { CommentThread } from "~/components/web/comments/comment-thread"
import { CommentForm } from "~/components/web/comments/comment-form"
import { canonicalPortHref } from "~/lib/catalogue"
import { PageViewEvent } from "~/components/analytics/page-view-event"

type PageProps = {
  params: Promise<{ slug: string; theme: string; portId: string }>
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { portId } = await props.params
  const port = await findPort({ where: { id: portId } })

  if (!port) {
    return { title: "Port Not Found" }
  }

  const url = `/platforms/${port.platform.slug}/${port.theme.slug}/${port.id}`

  return {
    title: port.name ?? `${port.theme.name} for ${port.platform.name}`,
    description: port.description ?? undefined,
    alternates: { ...metadataConfig.alternates, canonical: canonicalPortHref(port.theme.slug, port.platform.slug, port.id) },
    openGraph: { url, type: "website" },
  }
}

export default async function PlatformPortPage(props: PageProps) {
  const { slug, theme, portId } = await props.params

  const [platform, themeEntity, port] = await Promise.all([
    findPlatform({ where: { slug } }),
    findTheme({ where: { slug: theme } }),
    findPort({ where: { id: portId } }),
  ])

  if (!platform || !themeEntity || !port) {
    notFound()
  }

  // URL param validation
  if (port.platform.slug !== slug || port.theme.slug !== theme) {
    notFound()
  }

  const comments = await findCommentsByPort(port.id)
  const canonical = canonicalPortHref(port.theme.slug, port.platform.slug, port.id)

  return (
    <>
      <PageViewEvent
        event="port_viewed"
        properties={{ portId: port.id, themeSlug: theme, platformSlug: slug }}
      />

      <Breadcrumbs
        items={[
          { href: "/platforms", name: "Platforms" },
          { href: `/platforms/${platform.slug}`, name: platform.name },
          {
            href: `/platforms/${platform.slug}/${themeEntity.slug}`,
            name: themeEntity.name,
          },
          {
            href: `/platforms/${platform.slug}/${themeEntity.slug}/${port.id}`,
            name: port.name ?? "Port",
          },
        ]}
      />

      <Section>
        <Section.Content>
          <PortDetail
            port={port}
            canonicalUrl={canonical}
          />
        </Section.Content>
      </Section>

      <Section>
        <Section.Content>
          <h2 className="mb-4 text-xl font-semibold">Comments</h2>
          <CommentForm portId={port.id} />
          <div className="mt-6">
            <CommentThread comments={comments} portId={port.id} />
          </div>
        </Section.Content>
      </Section>
    </>
  )
}
