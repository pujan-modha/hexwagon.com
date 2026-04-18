import { siteConfig } from "~/config/site"

export const linksConfig = {
  author: "https://pujan.pm",
  twitter: "https://x.com/pujan_modha",
  discord: "https://discord.gg/hexwagon",
  reddit: "https://www.reddit.com/r/hexwagon/",
  builtWith: "https://dirstarter.com",
  analytics: "https://analytics.hexwagon.com/share/overview/ivJq7F",
  feeds: [
    { title: "Theme Ports", url: `${siteConfig.url}/rss/ports.xml` },
    { title: "Themes", url: `${siteConfig.url}/rss/themes.xml` },
    { title: "Platforms", url: `${siteConfig.url}/rss/platforms.xml` },
    { title: "Configs", url: `${siteConfig.url}/rss/configs.xml` },
  ],
}
