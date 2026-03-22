import { env } from "~/env"

export const siteConfig = {
  name: "HexWagon",
  slug: "hexwagon",
  tagline: "Theme Ports for Every Platform",
  description:
    "The definitive source for discovering, sharing, and managing color theme ports across applications and platforms.",
  email: env.NEXT_PUBLIC_SITE_EMAIL,
  url: env.NEXT_PUBLIC_SITE_URL,

  alphabet: "abcdefghijklmnopqrstuvwxyz",

  affiliateUrl: "https://go.hexwagon.com",
}
