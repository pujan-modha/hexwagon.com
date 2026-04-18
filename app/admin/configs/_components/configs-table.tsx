"use client"

import { ConfigStatus } from "@prisma/client"
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
import type { findConfigs } from "~/server/admin/configs/queries"
import { configsTableParamsSchema } from "~/server/admin/configs/schema"
import type { DataTableFilterField } from "~/types"
import { getColumns } from "./configs-table-columns"
import { ConfigsTableToolbarActions } from "./configs-table-toolbar-actions"

type ConfigRow = Awaited<ReturnType<typeof findConfigs>>["configs"][number]

type ConfigsTableProps = {
  configsPromise: ReturnType<typeof findConfigs>
}

export function ConfigsTable({ configsPromise }: ConfigsTableProps) {
  const { configs, configsTotal, pageCount } = use(configsPromise) as {
    configs: ConfigRow[]
    configsTotal: number
    pageCount: number
  }
  const [{ perPage, sort }] = useQueryStates(configsTableParamsSchema)

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
      options: Object.values(ConfigStatus).map(status => ({
        label: status,
        value: status,
      })),
    },
  ]

  const { table } = useDataTable({
    data: configs as any,
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
        title="Configs"
        total={configsTotal}
        callToAction={
          <Button variant="primary" size="md" prefix={<Icon name="lucide/plus" />} asChild>
            <Link href="/admin/configs/new">
              <div className="max-sm:sr-only">New config</div>
            </Link>
          </Button>
        }
      >
        <DataTableToolbar table={table} filterFields={filterFields}>
          <ConfigsTableToolbarActions table={table} />
          <DateRangePicker align="end" />
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTableHeader>
    </DataTable>
  )
}
