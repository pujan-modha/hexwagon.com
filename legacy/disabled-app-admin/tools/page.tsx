import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findPorts } from "~/server/admin/ports/queries"
import { portsTableParamsCache } from "~/server/admin/ports/schema"
import { ToolsTable } from "./_components/tools-table"

type ToolsPageProps = {
  searchParams: Promise<SearchParams>
}

const ToolsPage = async ({ searchParams }: ToolsPageProps) => {
  const search = portsTableParamsCache.parse(await searchParams)
  const toolsPromise = findPorts(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Ports" />}>
      <ToolsTable toolsPromise={toolsPromise} />
    </Suspense>
  )
}

export default withAdminPage(ToolsPage)
