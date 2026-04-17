import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findConfigs } from "~/server/admin/configs/queries"
import { configsTableParamsCache } from "~/server/admin/configs/schema"
import { ConfigsTable } from "./_components/configs-table"

type ConfigsPageProps = {
  searchParams: Promise<SearchParams>
}

const ConfigsPage = async ({ searchParams }: ConfigsPageProps) => {
  const search = configsTableParamsCache.parse(await searchParams)
  const configsPromise = findConfigs(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Configs" />}>
      <ConfigsTable configsPromise={configsPromise} />
    </Suspense>
  )
}

export default withAdminPage(ConfigsPage)
