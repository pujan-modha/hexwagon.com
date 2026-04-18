import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"
import { withAdminPage } from "~/components/admin/auth-hoc"
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton"
import { findPorts } from "~/server/admin/ports/queries"
import { portsTableParamsCache } from "~/server/admin/ports/schema"
import { PortsTable } from "./_components/ports-table"

type PortsPageProps = {
  searchParams: Promise<SearchParams>
}

const PortsPage = async ({ searchParams }: PortsPageProps) => {
  const search = portsTableParamsCache.parse(await searchParams)
  const portsPromise = findPorts(search)

  return (
    <Suspense fallback={<DataTableSkeleton title="Ports" />}>
      <PortsTable portsPromise={portsPromise} />
    </Suspense>
  )
}

export default withAdminPage(PortsPage)
