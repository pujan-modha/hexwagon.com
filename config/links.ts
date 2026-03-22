import { siteConfig } from "~/config/site"

export const linksConfig = {
  builtWith: "https://dirstarter.com",
  author: "https://kulpinski.pl",
  twitter: "https://x.com/hexwagon",
  bluesky: "https://bsky.app/profile/hexwagon.com",
  mastodon: "https://mastodon.social/@hexwagon",
  linkedin: "https://linkedin.com/company/hexwagon",
  reddit: "https://www.reddit.com/r/hexwagon/",
  analytics: "https://go.hexwagon.com/analytics",
  feeds: [
    { title: "Theme Ports", url: `${siteConfig.url}/rss/ports.xml` },
    { title: "Themes", url: `${siteConfig.url}/rss/themes.xml` },
  ],
  family: [
    {
      title: "EuroAlternative",
      href: "https://euroalternative.co",
      description: "Discover European alternatives to big tech companies",
    },
    {
      title: "DevSuite",
      href: "https://devsuite.co",
      description: "Find the perfect developer software for your next project",
    },
    {
      title: "OpenAds",
      href: "https://openads.co",
      description: "Automate ad spot management and increase website revenue",
    },
    {
      title: "Dirstarter",
      href: "https://dirstarter.com",
      description: "Next.js directory website boilerplate",
    },
  ],
  toolsUsed: [
    {
      title: "ScreenshotOne",
      href: "https://kulp.in/screenshotone",
      description: "The screenshot API for developers",
    },
    {
      title: "Typefully",
      href: "https://kulp.in/typefully",
      description: "Twitter scheduling/analytics",
    },
    {
      title: "Beehiiv",
      href: "https://kulp.in/beehiiv",
      description: "Newsletter",
    },
    {
      title: "Airtable",
      href: "https://kulp.in/airtable",
      description: "Database",
    },
    {
      title: "Screen Studio",
      href: "https://kulp.in/screenstudio",
      description: "Screen recording for marketing videos",
    },
  ],
}
