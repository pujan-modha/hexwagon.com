"use client"

import { formatDate } from "@primoui/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { RowCheckbox } from "~/components/admin/row-checkbox"
import { Badge } from "~/components/common/badge"
import { Note } from "~/components/common/note"
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header"
import { DataTableLink } from "~/components/data-table/data-table-link"
import type { findConfigs } from "~/server/admin/configs/queries"
import { ConfigActions } from "./config-actions"

type ConfigRow = Awaited<ReturnType<typeof findConfigs>>["configs"][number]

export const getColumns = (): ColumnDef<ConfigRow>[] => {
  return [
    {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <RowCheckbox
          checked={table.getIsAllPageRowsSelected()}
          ref={input => {
            if (input) {
              input.indeterminate =
                table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
            }
          }}
          onChange={e => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox
          checked={row.getIsSelected()}
          onChange={e => row.toggleSelected(e.target.checked)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <DataTableLink href={`/admin/configs/${row.original.slug}`} title={row.original.name} />
      ),
    },
    {
      accessorKey: "slug",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => <Note>{row.original.slug}</Note>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
    },
    {
      accessorKey: "isFeatured",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Featured" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.isFeatured ? "Yes" : "No"}</Badge>,
    },
    {
      id: "themes",
      accessorFn: row => row._count.configThemes,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Themes" />,
      cell: ({ row }) => <Note>{row.original._count.configThemes}</Note>,
    },
    {
      id: "platforms",
      accessorFn: row => row._count.configPlatforms,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Platforms" />,
      cell: ({ row }) => <Note>{row.original._count.configPlatforms}</Note>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => <Note>{formatDate(row.original.createdAt)}</Note>,
    },
    {
      id: "actions",
      cell: ({ row }) => <ConfigActions config={row.original} className="float-right" />,
    },
  ]
}
