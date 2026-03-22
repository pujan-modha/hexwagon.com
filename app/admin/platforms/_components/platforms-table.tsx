"use client"

import { useQueryStates } from "nuqs"
import { use, useMemo } from "react"
import { DateRangePicker } from "~/components/admin/date-range-picker"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { DataTable } from "~/components/data-table/data-table"
import { DataTableHeader } from "~/components/data-table/data-table-header"
import { DataTableToolbar } from "~/components/data-table/data-table-toolbar"
import { DataTableViewOptions } from "~/components/data-table/data-table-view-options"
import { useDataTable } from "~/hooks/use-data-table"
import type { findPlatforms } from "~/server/admin/platforms/queries"
import { platformsTableParamsSchema } from "~/server/admin/platforms/schema"
import type { DataTableFilterField } from "~/types"
import { getColumns } from "./platforms-table-columns"
import { PlatformsTableToolbarActions } from "./platforms-table-toolbar-actions"

type PlatformRow = Awaited<ReturnType<typeof findPlatforms>>["platforms"][number]

type PlatformsTableProps = {
  platformsPromise: ReturnType<typeof findPlatforms>
}

export function PlatformsTable({ platformsPromise }: PlatformsTableProps) {
  const { platforms, platformsTotal, pageCount } = use(platformsPromise) as {
    platforms: PlatformRow[]
    platformsTotal: number
    pageCount: number
  }
  const [{ perPage, sort }] = useQueryStates(platformsTableParamsSchema)

  const columns = useMemo(() => getColumns() as any, [])

  const filterFields: DataTableFilterField<any>[] = [
    {
      id: "name",
      label: "Name",
      placeholder: "Search by name...",
    },
  ]

  const { table } = useDataTable({
    data: platforms as any,
    columns,
    pageCount,
    filterFields,
    shallow: false,
    clearOnDefault: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: perPage },
      sorting: sort as any,
      columnPinning: { right: ["actions"] },
    },
    getRowId: originalRow => originalRow.id,
  })

  return (
    <DataTable table={table}>
      <DataTableHeader
        title="Platforms"
        total={platformsTotal}
        callToAction={
          <Button variant="primary" size="md" prefix={<Icon name="lucide/plus" />} asChild>
            <Link href="/admin/platforms/new">
              <div className="max-sm:sr-only">New platform</div>
            </Link>
          </Button>
        }
      >
        <DataTableToolbar table={table} filterFields={filterFields}>
          <PlatformsTableToolbarActions table={table} />
          <DateRangePicker align="end" />
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTableHeader>
    </DataTable>
  )
}
