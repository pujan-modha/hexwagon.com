import { PortStatus } from "@prisma/client"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { DashboardAdsSection } from "~/app/(web)/dashboard/ads-section"
import { DashboardLikedSection } from "~/app/(web)/dashboard/liked-section"
import type { DashboardPageProps } from "~/app/(web)/dashboard/page"
import { DashboardTable } from "~/app/(web)/dashboard/table"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { auth } from "~/lib/auth"
import { findTools } from "~/server/admin/tools/queries"
import { toolsTableParamsCache } from "~/server/admin/tools/schema"
import { findUserAdsByEmail } from "~/server/web/ads/queries"
import { findUserLikedEntities } from "~/server/web/likes/queries"
import { hasMaintainedThemes } from "~/server/web/theme-maintainers/queries"

export const DashboardToolListing = async ({ searchParams }: DashboardPageProps) => {
  const parsedParams = toolsTableParamsCache.parse(await searchParams)
  const session = await auth.api.getSession({ headers: await headers() })
  const status = [
    PortStatus.Draft,
    PortStatus.Scheduled,
    PortStatus.Published,
    PortStatus.PendingEdit,
  ]

  if (!session?.user) {
    throw redirect("/auth/login?next=/dashboard")
  }

  const toolsPromise = findTools(
    { ...parsedParams, status: status },
    {
      OR: [{ submitterEmail: session.user.email }, { authorId: session.user.id }],
    },
  )
  const userAds = await findUserAdsByEmail(session.user.email)
  const liked = await findUserLikedEntities(session.user.id)
  const isMaintainer = await hasMaintainedThemes(session.user.id)

  return (
    <>
      <Suspense fallback={<DataTableSkeleton />}>
        <DashboardTable toolsPromise={toolsPromise} showMaintainerConsoleButton={isMaintainer} />
      </Suspense>

      <DashboardAdsSection ads={userAds} />

      <DashboardLikedSection liked={liked} />
    </>
  )
}
