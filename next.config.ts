import { withContentCollections } from "@content-collections/next"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: ["hexwagon.local"],

  experimental: {
    ppr: true,
    useCache: true,

    optimizePackageImports: [
      "@content-collections/core",
      "@content-collections/mdx",
      "@content-collections/next",
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 768, 1024],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
      {
        hostname: `${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`,
      },
    ],
  },

  rewrites: async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const posthogUrl = process.env.NEXT_PUBLIC_POSTHOG_HOST
    const posthogAssetsUrl = posthogUrl
      ?.replace("://us.i.", "://us-assets.i.")
      .replace("://eu.i.", "://eu-assets.i.")

    const rewrites = [
      // RSS rewrites
      {
        source: "/rss.xml",
        destination: `${siteUrl}/rss/ports.xml`,
      },
      {
        source: "/themes/rss.xml",
        destination: `${siteUrl}/rss/themes.xml`,
      },
      {
        source: "/platforms/rss.xml",
        destination: `${siteUrl}/rss/platforms.xml`,
      },
      {
        source: "/configs/rss.xml",
        destination: `${siteUrl}/rss/configs.xml`,
      },
    ]

    // Add PostHog proxy rewrites only if the host is configured
    if (posthogUrl) {
      rewrites.push(
        {
          source: "/api/ins/static/:path*",
          destination: `${posthogAssetsUrl}/static/:path*`,
        },
        {
          source: "/api/ins/:path*",
          destination: `${posthogUrl}/:path*`,
        },
      )
    }

    return rewrites
  },
}

export default withContentCollections(nextConfig)
