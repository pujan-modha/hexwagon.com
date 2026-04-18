import { env } from "~/env"

export const siteConfig = {
  name: "HexWagon",
  slug: "hexwagon",
  tagline: "Theme Ports for Every Platform",
  description:
    "A directory of theme ports for VS Code, Ghostty, Neovim, Zed, and other platforms. Discover exact combinations like Dracula for VS Code, compare alternatives, and track missing ports.",
  email: env.NEXT_PUBLIC_SITE_EMAIL,
  url: env.NEXT_PUBLIC_SITE_URL,

  alphabet: "abcdefghijklmnopqrstuvwxyz",

  affiliateUrl: "https://go.hexwagon.com",
}
