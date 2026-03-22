"use client"

import { formatDate } from "@primoui/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { PortActions } from "./port-actions"
import { RowCheckbox } from "~/components/admin/row-checkbox"
import { Badge } from "~/components/common/badge"
import { Note } from "~/components/common/note"
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header"
import { DataTableLink } from "~/components/data-table/data-table-link"
import type { findPorts } from "~/server/admin/ports/queries"

type PortRow = Awaited<ReturnType<typeof findPorts>>["ports"][number]

export const getColumns = (): ColumnDef<PortRow>[] => {
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
        <DataTableLink href={`/admin/ports/${row.original.slug}`} title={row.original.name ?? ""} />
      ),
    },
    {
      accessorKey: "theme",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Theme" />,
      cell: ({ row }) => {
        const port = row.original as PortRow & {
          theme?: { name: string; slug: string }
        }

        return <Note>{port.theme?.name ?? "Unknown"}</Note>
      },
    },
    {
      accessorKey: "platform",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Platform" />,
      cell: ({ row }) => {
        const port = row.original as PortRow & {
          platform?: { name: string; slug: string }
        }

        return <Note>{port.platform?.name ?? "Unknown"}</Note>
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
    },
    {
      accessorKey: "publishedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Published" />,
      cell: ({ row }) => (
        <Note>{row.original.publishedAt ? formatDate(row.original.publishedAt) : "Draft"}</Note>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <PortActions port={row.original as any} className="float-right" />,
    },
  ]
}
