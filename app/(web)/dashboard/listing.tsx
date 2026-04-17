import { PortStatus } from "@prisma/client"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { DashboardConfigsSection } from "~/app/(web)/dashboard/configs-section"
import { DashboardLikedSection } from "~/app/(web)/dashboard/liked-section"
import type { DashboardPageProps } from "~/app/(web)/dashboard/page"
import { DashboardTable } from "~/app/(web)/dashboard/table"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { auth } from "~/lib/auth"
import { findTools } from "~/server/admin/tools/queries"
import { toolsTableParamsCache } from "~/server/admin/tools/schema"
import { findUserConfigs } from "~/server/web/configs/queries"
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
  const userConfigsPromise = findUserConfigs(session.user.id)
  const liked = await findUserLikedEntities(session.user.id)
  const isMaintainer = await hasMaintainedThemes(session.user.id)
  const userConfigs = await userConfigsPromise

  return (
    <>
      <Suspense fallback={<DataTableSkeleton />}>
        <DashboardTable toolsPromise={toolsPromise} showMaintainerConsoleButton={isMaintainer} />
      </Suspense>

      <DashboardConfigsSection configs={userConfigs} />

      <DashboardLikedSection liked={liked} />
    </>
  )
}
