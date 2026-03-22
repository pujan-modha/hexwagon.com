"use client"

import { PortStatus } from "@prisma/client"
import { useQueryStates } from "nuqs"
import { use, useMemo } from "react"
import { DateRangePicker } from "~/components/admin/date-range-picker"
import { Badge } from "~/components/common/badge"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { DataTable } from "~/components/data-table/data-table"
import { DataTableHeader } from "~/components/data-table/data-table-header"
import { DataTableToolbar } from "~/components/data-table/data-table-toolbar"
import { DataTableViewOptions } from "~/components/data-table/data-table-view-options"
import { useDataTable } from "~/hooks/use-data-table"
import type { findPorts } from "~/server/admin/ports/queries"
import { portsTableParamsSchema } from "~/server/admin/ports/schema"
import type { DataTableFilterField } from "~/types"
import { getColumns } from "./ports-table-columns"
import { PortsTableToolbarActions } from "./ports-table-toolbar-actions"

type PortRow = Awaited<ReturnType<typeof findPorts>>["ports"][number]

type PortsTableProps = {
  portsPromise: ReturnType<typeof findPorts>
}

export function PortsTable({ portsPromise }: PortsTableProps) {
  const { ports, portsTotal, pageCount } = use(portsPromise) as {
    ports: PortRow[]
    portsTotal: number
    pageCount: number
  }
  const [{ perPage, sort }] = useQueryStates(portsTableParamsSchema)

  const columns = useMemo(() => getColumns() as any, [])

  const filterFields: DataTableFilterField<any>[] = [
    {
      id: "name",
      label: "Name",
      placeholder: "Search by name...",
    },
    {
      id: "status",
      label: "Status",
      options: Object.values(PortStatus).map(status => ({
        label: status,
        value: status,
      })),
    },
  ]

  const { table } = useDataTable({
    data: ports as any,
    columns,
    pageCount,
    filterFields,
    shallow: false,
    clearOnDefault: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: perPage },
      sorting: sort as any,
      columnVisibility: { submitterEmail: false, createdAt: false },
      columnPinning: { right: ["actions"] },
    },
    getRowId: originalRow => originalRow.id,
  })

  return (
    <DataTable table={table}>
      <DataTableHeader
        title="Ports"
        total={portsTotal}
        callToAction={
          <Button variant="primary" size="md" prefix={<Icon name="lucide/plus" />} asChild>
            <Link href="/admin/ports/new">
              <div className="max-sm:sr-only">New port</div>
            </Link>
          </Button>
        }
      >
        <DataTableToolbar table={table} filterFields={filterFields}>
          <PortsTableToolbarActions table={table} />
          <DateRangePicker align="end" />
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTableHeader>
    </DataTable>
  )
}
