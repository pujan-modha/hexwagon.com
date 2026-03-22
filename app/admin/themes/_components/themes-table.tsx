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
import type { findThemes } from "~/server/admin/themes/queries"
import { themesTableParamsSchema } from "~/server/admin/themes/schema"
import type { DataTableFilterField } from "~/types"
import { getColumns } from "./themes-table-columns"
import { ThemesTableToolbarActions } from "./themes-table-toolbar-actions"

type ThemeRow = Awaited<ReturnType<typeof findThemes>>["themes"][number]

type ThemesTableProps = {
  themesPromise: ReturnType<typeof findThemes>
}

export function ThemesTable({ themesPromise }: ThemesTableProps) {
  const { themes, themesTotal, pageCount } = use(themesPromise) as {
    themes: ThemeRow[]
    themesTotal: number
    pageCount: number
  }
  const [{ perPage, sort }] = useQueryStates(themesTableParamsSchema)

  const columns = useMemo(() => getColumns() as any, [])

  const filterFields: DataTableFilterField<any>[] = [
    {
      id: "name",
      label: "Name",
      placeholder: "Search by name...",
    },
  ]

  const { table } = useDataTable({
    data: themes as any,
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
        title="Themes"
        total={themesTotal}
        callToAction={
          <Button variant="primary" size="md" prefix={<Icon name="lucide/plus" />} asChild>
            <Link href="/admin/themes/new">
              <div className="max-sm:sr-only">New theme</div>
            </Link>
          </Button>
        }
      >
        <DataTableToolbar table={table} filterFields={filterFields}>
          <ThemesTableToolbarActions table={table} />
          <DateRangePicker align="end" />
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTableHeader>
    </DataTable>
  )
}
