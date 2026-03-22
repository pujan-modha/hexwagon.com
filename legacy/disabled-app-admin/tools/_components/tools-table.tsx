"use client"

import { type Port, PortStatus } from "@prisma/client"
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
import type { findPorts } from "~/server/admin/ports/queries"
import { portsTableParamsSchema } from "~/server/admin/ports/schema"
import type { DataTableFilterField } from "~/types"
import { getColumns } from "./tools-table-columns"
import { ToolsTableToolbarActions } from "./tools-table-toolbar-actions"

type ToolsTableProps = {
  toolsPromise: ReturnType<typeof findPorts>
}

export function ToolsTable({ toolsPromise }: ToolsTableProps) {
  const { ports, portsTotal, pageCount } = use(toolsPromise)
  const [{ perPage, sort }] = useQueryStates(portsTableParamsSchema)

  // Memoize the columns so they don't re-render on every render
  const columns = useMemo(() => getColumns(), [])

  // Search filters
  const filterFields: DataTableFilterField<Port>[] = [
    {
      id: "name",
      label: "Name",
      placeholder: "Search by name...",
    },
    {
      id: "status",
      label: "Status",
      options: [
        {
          label: "Published",
          value: PortStatus.Published,
          icon: <Icon name="lucide/circle" className="text-green-500" />,
        },
        {
          label: "Scheduled",
          value: PortStatus.Scheduled,
          icon: <Icon name="lucide/circle-dot-dashed" className="text-blue-500" />,
        },
        {
          label: "Draft",
          value: PortStatus.Draft,
          icon: <Icon name="lucide/circle-dashed" className="text-gray-500" />,
        },
      ],
    },
  ]

  const { table } = useDataTable({
    data: ports,
    columns,
    pageCount,
    filterFields,
    shallow: false,
    clearOnDefault: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: perPage },
      sorting: sort,
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
          <ToolsTableToolbarActions table={table} />
          <DateRangePicker align="end" />
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTableHeader>
    </DataTable>
  )
}
