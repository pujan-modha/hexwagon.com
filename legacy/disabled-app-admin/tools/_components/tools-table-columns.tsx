"use client"

import { formatDate } from "@primoui/utils"
import { type Port, PortStatus } from "@prisma/client"
import type { ColumnDef } from "@tanstack/react-table"
import type { ComponentProps } from "react"
import { PortActions } from "~/app/admin/tools/_components/port-actions"
import { RowCheckbox } from "~/components/admin/row-checkbox"
import { Badge } from "~/components/common/badge"
import { Note } from "~/components/common/note"
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header"
import { DataTableLink } from "~/components/data-table/data-table-link"

export const getColumns = (): ColumnDef<Port>[] => {
  const statusBadges: Record<PortStatus, ComponentProps<typeof Badge>> = {
    [PortStatus.Draft]: {
      variant: "soft",
    },

    [PortStatus.Scheduled]: {
      variant: "info",
    },

    [PortStatus.Published]: {
      variant: "success",
    },
  }

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
      enableHiding: false,
      size: 160,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const { name, slug, faviconUrl } = row.original

        return <DataTableLink href={`/admin/ports/${slug}`} image={faviconUrl} title={name} />
      },
    },
    {
      accessorKey: "description",
      enableSorting: false,
      size: 320,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <Note className="truncate">{row.getValue("description")}</Note>,
    },
    {
      accessorKey: "submitterEmail",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Submitter" />,
      cell: ({ row }) => <Note className="text-sm">{row.getValue("submitterEmail")}</Note>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge {...statusBadges[row.original.status]}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: "pageviews",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pageviews" />,
      cell: ({ row }) => <Note>{row.getValue("pageviews")?.toLocaleString()}</Note>,
    },
    {
      accessorKey: "publishedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Published At" />,
      cell: ({ row }) =>
        row.original.publishedAt ? (
          <Note>{formatDate(row.getValue<Date>("publishedAt"))}</Note>
        ) : (
          <Note>—</Note>
        ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
      cell: ({ row }) => <Note>{formatDate(row.getValue<Date>("createdAt"))}</Note>,
    },
    {
      id: "actions",
      cell: ({ row }) => <PortActions port={row.original} className="float-right" />,
    },
  ]
}
