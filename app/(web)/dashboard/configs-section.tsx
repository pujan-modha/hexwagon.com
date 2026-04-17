"use client"

import { formatDate } from "@primoui/utils"
import { ConfigStatus } from "@prisma/client"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { Note } from "~/components/common/note"
import { Stack } from "~/components/common/stack"
import { DataTable } from "~/components/data-table/data-table"
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header"
import { DataTableLink } from "~/components/data-table/data-table-link"
import { DataTableToolbar } from "~/components/data-table/data-table-toolbar"
import { configHref } from "~/lib/catalogue"
import type { findUserConfigs } from "~/server/web/configs/queries"
import type { DataTableFilterField } from "~/types"
import { ConfigEditDialog } from "./config-edit-dialog"

type DashboardConfigRow = Awaited<ReturnType<typeof findUserConfigs>>[number]

type DashboardConfigsSectionProps = {
  configs: Awaited<ReturnType<typeof findUserConfigs>>
}

export const DashboardConfigsSection = ({ configs }: DashboardConfigsSectionProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns = useMemo<ColumnDef<DashboardConfigRow>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const { name, slug, status } = row.original

          if (status === ConfigStatus.Draft) {
            return <Note className="font-medium">{name}</Note>
          }

          return <DataTableLink href={configHref(slug)} title={name} />
        },
      },
      {
        id: "publishedAt",
        accessorFn: row => row.updatedAt,
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Published At" />,
        cell: ({ row }) => {
          const { status, updatedAt, pendingEdits } = row.original

          if (pendingEdits.length > 0) {
            return (
              <Stack size="sm" wrap={false}>
                <Icon
                  name="lucide/clock"
                  className="stroke-3 text-amber-700/75 dark:text-amber-500/75"
                />
                <span className="text-amber-700/75 dark:text-amber-500/75">
                  Edit pending review
                </span>
              </Stack>
            )
          }

          if (status === ConfigStatus.Published) {
            return (
              <Stack size="sm" wrap={false}>
                <Icon
                  name="lucide/circle"
                  className="stroke-3 text-green-600/75 dark:text-green-500/75"
                />
                <Note className="font-medium">{formatDate(updatedAt)}</Note>
              </Stack>
            )
          }

          return (
            <Stack size="sm" wrap={false}>
              <Icon name="lucide/circle-dashed" className="stroke-3 text-muted-foreground/75" />
              <span className="text-muted-foreground/75">Awaiting review</span>
            </Stack>
          )
        },
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span>Actions</span>,
        cell: ({ row }) => <ConfigEditDialog config={row.original} />,
      },
    ],
    [],
  )

  const filterFields: DataTableFilterField<DashboardConfigRow>[] = [
    {
      id: "name",
      label: "Name",
      placeholder: "Search by name...",
    },
  ]

  const table = useReactTable({
    data: configs,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: row => row.id,
  })

  return (
    <section className="flex flex-col gap-4">
      <DataTable
        table={table}
        emptyState="No configs found. Submit a port or config to get started."
      >
        <DataTableToolbar table={table} filterFields={filterFields}>
          <Button size="md" variant="primary" prefix={<Icon name="lucide/plus" />} asChild>
            <Link href="/submit?type=config">Submit config</Link>
          </Button>
        </DataTableToolbar>
      </DataTable>
    </section>
  )
}
