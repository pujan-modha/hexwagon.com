import { siteConfig } from "~/config/site";
import type { AdOne } from "~/server/web/ads/payloads";

export type AdSpotType = "Banner" | "Listing" | "Sidebar" | "Footer";

export type AdSpot = {
  label: string;
  type: AdSpotType;
  description: string;
  price: number;
  preview?: string;
};

export const adsConfig = {
  minPageviewThreshold: 100,

  adSpots: [
    {
      label: "Top Banner",
      type: "Banner",
      description: "Visible at the top of the site",
      price: 45,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
    {
      label: "Listing Ad",
      type: "Listing",
      description: "Visible in listing grids",
      price: 25,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
    {
      label: "Sidebar Ad",
      type: "Sidebar",
      description: "Visible in detail page sidebar",
      price: 15,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
    {
      label: "Footer Ad",
      type: "Footer",
      description: "Visible in the site footer",
      price: 15,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
  ] satisfies AdSpot[],

  defaultAd: {
    type: "All",
    websiteUrl: "/advertise",
    name: "Your brand here",
    description: "Reach out to our audience of developers.",
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
};
