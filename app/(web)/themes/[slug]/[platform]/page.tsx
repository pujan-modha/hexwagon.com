import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs"
import { Section } from "~/components/web/ui/section"
import { metadataConfig } from "~/config/metadata"
import { findTheme } from "~/server/web/themes/queries"
import { findPlatform } from "~/server/web/platforms/queries"
import { findPortsByThemeAndPlatform } from "~/server/web/ports/queries"
import type { FilterSchema } from "~/server/web/shared/schema"
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header"
import { PortList, PortListSkeleton } from "~/components/catalogue/port-list"

type PageProps = {
  params: Promise<{ slug: string; platform: string }>
}

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { slug, platform } = await props.params
  const [theme, platformEntity] = await Promise.all([
    findTheme({ where: { slug } }),
    findPlatform({ where: { slug: platform } }),
  ])

  const url = `/themes/${slug}/${platform}`

  return {
    title: `${theme?.name ?? slug} ports for ${platformEntity?.name ?? platform}`,
    description: `Browse ${theme?.name ?? slug} theme ports for ${platformEntity?.name ?? platform}.`,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { url, type: "website" },
  }
}

export default async function ThemePlatformPage(props: PageProps) {
  const { slug, platform } = await props.params

  const [theme, platformEntity] = await Promise.all([
    findTheme({ where: { slug } }),
    findPlatform({ where: { slug: platform } }),
  ])

  if (!theme || !platformEntity) {
    notFound()
  }

  const ports = await findPortsByThemeAndPlatform(slug, platform, {} as FilterSchema)

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/themes", name: "Themes" },
          { href: `/themes/${theme.slug}`, name: theme.name },
          { href: `/themes/${theme.slug}/${platform}`, name: platformEntity.name },
        ]}
      />

      <Section>
        <Section.Content>
          <CatalogueListHeader
            title={`${theme.name} for ${platformEntity.name}`}
            description={`${ports.length} port${ports.length !== 1 ? "s" : ""} available`}
          />

          <Suspense fallback={<PortListSkeleton count={3} />}>
            <PortList
              ports={ports}
              routePrefix="themes"
              themeSlug={theme.slug}
              platformSlug={platformEntity.slug}
            />
          </Suspense>
        </Section.Content>
      </Section>
    </>
  )
}
