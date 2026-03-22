import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findPlatforms } from "~/server/admin/platforms/queries"
import { platformsTableParamsCache } from "~/server/admin/platforms/schema"
import { PlatformsTable } from "./_components/platforms-table"

type PlatformsPageProps = {
  searchParams: Promise<SearchParams>
}

const PlatformsPage = async ({ searchParams }: PlatformsPageProps) => {
  const search = platformsTableParamsCache.parse(await searchParams)
  const platformsPromise = findPlatforms(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Platforms" />}>
      <PlatformsTable platformsPromise={platformsPromise} />
    </Suspense>
  )
}

export default withAdminPage(PlatformsPage)
