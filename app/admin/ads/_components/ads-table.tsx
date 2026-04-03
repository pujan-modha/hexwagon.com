"use client"

import { useMemo } from "react"
import { DataTable } from "~/components/data-table/data-table"
import { DataTableHeader } from "~/components/data-table/data-table-header"
import { DataTableToolbar } from "~/components/data-table/data-table-toolbar"
import { DataTableViewOptions } from "~/components/data-table/data-table-view-options"
import { useDataTable } from "~/hooks/use-data-table"
import type { AdAdminMany } from "~/server/admin/ads/payloads"
import type { DataTableFilterField } from "~/types"
import { getColumns } from "./ads-table-columns"

type AdsTableProps = {
  ads: AdAdminMany[]
}

export const AdsTable = ({ ads }: AdsTableProps) => {
  const columns = useMemo(() => getColumns(), [])

  const typeOptions = Array.from(new Set(ads.map(ad => ad.type))).map(type => ({
    label: type,
    value: type,
  }))

  const filterFields: DataTableFilterField<any>[] = [
    {
      id: "name",
      label: "Ad",
      placeholder: "Search by ad name...",
    },
    {
      id: "status",
      label: "Status",
      options: ["Pending", "Approved", "Rejected", "Cancelled"].map(status => ({
        label: status,
        value: status,
      })),
    },
    {
      id: "type",
      label: "Type",
      options: typeOptions,
    },
    {
      id: "source",
      label: "Source",
      options: [
        { label: "Admin", value: "Admin" },
        { label: "Checkout", value: "Checkout" },
      ],
    },
    {
      id: "rotation",
      label: "Rotation",
      options: [
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ],
    },
  ]

  const { table } = useDataTable({
    data: ads,
    columns,
    pageCount: Math.max(1, Math.ceil(ads.length / 25)),
    filterFields,
    shallow: true,
    clearOnDefault: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 25 },
      sorting: [{ id: "startsAt", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: row => row.id,
  })

  return (
    <DataTable
      table={table}
      className="[&_tbody_tr]:!h-auto [&_tbody_tr]:!items-start [&_tbody_td]:py-3"
    >
      <DataTableHeader title="Ads" total={ads.length}>
        <DataTableToolbar table={table} filterFields={filterFields}>
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
      </DataTableHeader>
    </DataTable>
  )
}
