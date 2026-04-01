import { siteConfig } from "~/config/site";

export const linksConfig = {
  author: "https://pujan.pm",
  twitter: "https://x.com/pujan_modha",
  linkedin: "https://linkedin.com/in/pujan-modha",
  reddit: "https://www.reddit.com/r/hexwagon/",
  builtWith: "https://dirstarter.com",
  analytics: "https://go.hexwagon.com/analytics",
  feeds: [
    { title: "Theme Ports", url: `${siteConfig.url}/rss/ports.xml` },
    { title: "Themes", url: `${siteConfig.url}/rss/themes.xml` },
    { title: "Platforms", url: `${siteConfig.url}/rss/platforms.xml` },
  ],
};
