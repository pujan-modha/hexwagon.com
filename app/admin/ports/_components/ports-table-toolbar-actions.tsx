"use client"

import type { Port } from "@prisma/client"
import type { Table } from "@tanstack/react-table"
import { PortsDeleteDialog } from "./ports-delete-dialog"

type PortsTableToolbarActionsProps = {
  table: Table<Port>
}

export function PortsTableToolbarActions({ table }: PortsTableToolbarActionsProps) {
  const selectedPorts = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  return selectedPorts.length > 0 ? (
    <PortsDeleteDialog tools={selectedPorts} onSuccess={() => table.toggleAllRowsSelected(false)} />
  ) : null
}
