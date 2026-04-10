import type { Metadata } from "next"
import type { PropsWithChildren } from "react"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { metadataConfig } from "~/config/metadata"
import { buildRobots } from "~/lib/seo"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your account and theme port submissions.",
  openGraph: { ...metadataConfig.openGraph, url: "/dashboard" },
  alternates: { ...metadataConfig.alternates, canonical: "/dashboard" },
  robots: buildRobots({ index: false, follow: true }),
}

export default function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <>
      <Intro>
        <IntroTitle>Dashboard</IntroTitle>
        <IntroDescription>Welcome back! Manage your account and submissions.</IntroDescription>
      </Intro>

      <div className="flex flex-col gap-4">
        {/* <DashboardNav className="mb-2" /> */}

        {children}
      </div>
    </>
  )
}
