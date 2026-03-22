import type { AdType } from "@prisma/client"
import { siteConfig } from "~/config/site"
import type { AdOne } from "~/server/web/ads/payloads"

export type AdSpot = {
  label: string
  type: AdType
  description: string
  price: number
  preview?: string
}

export const adsConfig = {
  minPageviewThreshold: 100,

  adSpots: [
    {
      label: "Listing Ad",
      type: "Ports",
      description: "Visible on every port listing page",
      price: 15,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
  ] satisfies AdSpot[],

  defaultAd: {
    type: "All",
    websiteUrl: "/advertise",
    name: "Your brand here",
    description:
      "Reach out to our audience of theme enthusiasts and developers, boost your sales and brand awareness.",
    buttonLabel: `Advertise on ${siteConfig.name}`,
    faviconUrl: null,
  } satisfies AdOne,

  testimonials: [
    {
      quote:
        "HexWagon has been a solid traffic source for our theme project since we partnered up with them. Their homepage spot, in particular, delivered great results. Highly recommended!",
      author: {
        name: "Theme Developer",
        title: "Theme Author",
        image: "/authors/abdullahatta.webp",
      },
    },
  ],
}
