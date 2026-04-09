import { siteConfig } from "~/config/site"
import type { AdOne } from "~/server/web/ads/payloads"

export type AdSpotType = "Banner" | "Listing" | "Sidebar" | "Footer"

export type AdSpot = {
  label: string
  type: AdSpotType
  description: string
  price: number
  preview?: string
}

export type AdPackageCycle = "Weekly" | "Monthly"

export type AdPackageCyclePricing = {
  basePrice: number
  discountedPrice: number
  targetUnitPrice: number
}

export type AdPackagePricing = Record<AdPackageCycle, AdPackageCyclePricing>

export const adsConfig = {
  minPageviewThreshold: 100,
  paymentDeadlineHours: 24,

  package: {
    label: "Universal Reach",
    description: "One package that rotates across all ad placements with optional targeting boost.",
    pricing: {
      Weekly: {
        basePrice: 149,
        discountedPrice: 99,
        targetUnitPrice: 15,
      },
      Monthly: {
        basePrice: 499,
        discountedPrice: 349,
        targetUnitPrice: 45,
      },
    } satisfies AdPackagePricing,
  },

  adSpots: [
    {
      label: "Top Banner",
      type: "Banner",
      description: "Visible at the top of the site",
      price: 25,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
    {
      label: "Listing Ad",
      type: "Listing",
      description: "Visible in listing grids",
      price: 15,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
    {
      label: "Sidebar Ad",
      type: "Sidebar",
      description: "Visible in detail page sidebar",
      price: 20,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
    {
      label: "Footer Ad",
      type: "Footer",
      description: "Visible as a floating card at bottom-right",
      price: 15,
      preview: "https://share.cleanshot.com/7CFqSw0b",
    },
  ] satisfies AdSpot[],

  defaultAd: {
    id: "default-ad",
    type: "All",
    websiteUrl: "/advertise",
    name: "Advertise with us",
    description: "Reach out to our community of developers and designers.",
    buttonLabel: "Learn More",
    faviconUrl: "/favicon.svg",
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

  faq: [
    {
      question: "How are ads shown across the site?",
      answer:
        "Active approved campaigns rotate automatically across all placements using weighted random delivery.",
    },
    {
      question: "What are the 4 ad placements?",
      answer:
        "Top banner, listing card, sidebar card, and a floating card at bottom-right. Your creative can appear in any slot.",
    },
    {
      question: "What does targeting add-on do?",
      answer:
        "Theme and platform targeting boosts delivery for matching pages and matching ports. Each selected target adds to package price.",
    },
    {
      question: "What happens after payment?",
      answer:
        "We review and approve all campaigns before they go live. This process usually takes 8-12 hours.",
    },
    {
      question: "Do I get a refund if rejected?",
      answer: "Yes. Rejected paid campaigns are automatically refunded in full.",
    },
  ],
}
