import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "~/components/web/ui/breadcrumbs";
import { Section } from "~/components/web/ui/section";
import { metadataConfig } from "~/config/metadata";
import { findPlatform } from "~/server/web/platforms/queries";
import { findTheme } from "~/server/web/themes/queries";
import { findPortsByThemeAndPlatform } from "~/server/web/ports/queries";
import { CatalogueListHeader } from "~/components/catalogue/catalogue-list-header";
import { PortList, PortListSkeleton } from "~/components/catalogue/port-list";

type PageProps = {
  params: Promise<{ slug: string; theme: string }>;
};

export const generateMetadata = async (props: PageProps): Promise<Metadata> => {
  const { slug, theme } = await props.params;
  const [platform, themeEntity] = await Promise.all([
    findPlatform({ where: { slug } }),
    findTheme({ where: { slug: theme } }),
  ]);

  const url = `/platforms/${slug}/${theme}`;

  return {
    title: `${themeEntity?.name ?? theme} ports for ${platform?.name ?? slug}`,
    description: `Browse ${themeEntity?.name ?? theme} theme ports for ${platform?.name ?? slug}.`,
    alternates: { ...metadataConfig.alternates, canonical: url },
    openGraph: { url, type: "website" },
  };
};

export default async function PlatformThemePage(props: PageProps) {
  const { slug, theme } = await props.params;

  const [platform, themeEntity] = await Promise.all([
    findPlatform({ where: { slug } }),
    findTheme({ where: { slug: theme } }),
  ]);

  if (!platform || !themeEntity) {
    notFound();
  }

  // URL validation: ensure theme+platform combo exists
  const ports = await findPortsByThemeAndPlatform(theme, slug, {});

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/platforms", name: "Platforms" },
          { href: `/platforms/${platform.slug}`, name: platform.name },
          {
            href: `/platforms/${platform.slug}/${themeEntity.slug}`,
            name: themeEntity.name,
          },
        ]}
      />

      <Section>
        <Section.Content className="md:col-span-3">
          <CatalogueListHeader
            title={`${themeEntity.name} for ${platform.name}`}
            description={`${ports.length} port${ports.length !== 1 ? "s" : ""} available`}
          />

          <Suspense fallback={<PortListSkeleton count={3} />}>
            <PortList
              ports={ports}
              routePrefix="platforms"
              themeSlug={themeEntity.slug}
              platformSlug={platform.slug}
              showListingAd
            />
          </Suspense>
        </Section.Content>
      </Section>
    </>
  );
}
