"use client"

import { formatDate } from "@primoui/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { PlatformActions } from "./platform-actions"
import { RowCheckbox } from "~/components/admin/row-checkbox"
import { Badge } from "~/components/common/badge"
import { Note } from "~/components/common/note"
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header"
import { DataTableLink } from "~/components/data-table/data-table-link"
import type { findPlatforms } from "~/server/admin/platforms/queries"

type PlatformRow = Awaited<ReturnType<typeof findPlatforms>>["platforms"][number]

export const getColumns = (): ColumnDef<PlatformRow>[] => {
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
        <DataTableLink href={`/admin/platforms/${row.original.slug}`} title={row.original.name} />
      ),
    },
    {
      accessorKey: "slug",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => <Note>{row.original.slug}</Note>,
    },
    {
      accessorKey: "isFeatured",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Featured" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.isFeatured ? "Yes" : "No"}</Badge>,
    },
    {
      accessorKey: "_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ports" />,
      cell: ({ row }) => {
        const platform = row.original as PlatformRow & { _count?: { ports: number } }

        return <Note>{platform._count?.ports ?? 0}</Note>
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => <Note>{formatDate(row.original.createdAt)}</Note>,
    },
    {
      id: "actions",
      cell: ({ row }) => <PlatformActions platform={row.original as any} className="float-right" />,
    },
  ]
}
