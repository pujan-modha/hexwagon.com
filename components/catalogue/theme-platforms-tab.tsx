import type { PlatformMany } from "~/server/web/platforms/payloads";
import { themePlatformHref } from "~/lib/catalogue";
import { CatalogueGrid } from "./catalogue-grid";
import { PlatformCard } from "./platform-card";

type ThemePlatformsTabProps = {
  platforms: PlatformMany[];
  themeSlug: string;
};

const ThemePlatformsTab = ({ platforms, themeSlug }: ThemePlatformsTabProps) => {
  return (
    <CatalogueGrid className="lg:grid-cols-2">
      {platforms.map((platform) => (
        <PlatformCard
          key={platform.id}
          platform={platform}
          href={themePlatformHref(themeSlug, platform.slug)}
          showCount
        />
      ))}
    </CatalogueGrid>
  );
};

export { ThemePlatformsTab };
