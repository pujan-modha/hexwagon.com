"use client";

import { formatDate } from "@primoui/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/common/badge";
import { Note } from "~/components/common/note";
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header";
import type { AdAdminMany } from "~/server/admin/ads/payloads";
import { AdActions } from "./ad-actions";

type AdRow = AdAdminMany;

const getAdSource = (ad: AdRow) => {
  return ad.stripeCheckoutSessionId ||
    ad.stripePaymentIntentId ||
    ad.subscriptionId
    ? "Checkout"
    : "Admin";
};

export const getColumns = (): ColumnDef<AdRow>[] => {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ad" />
      ),
      cell: ({ row }) => {
        const ad = row.original;

        return (
          <div className="flex min-w-0 flex-col gap-1">
            <strong className="truncate font-medium">{ad.name}</strong>
            <Note className="truncate">{ad.description ?? ad.websiteUrl}</Note>
            <span className="truncate text-[11px] text-muted-foreground">
              {ad.websiteUrl}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "source",
      accessorFn: (row) => getAdSource(row),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Source" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{String(row.getValue("source"))}</Badge>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{String(row.getValue("type"))}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{String(row.getValue("status"))}</Badge>
      ),
    },
    {
      accessorKey: "rotation",
      accessorFn: (row) => (row.status === "Approved" ? "Active" : "Inactive"),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rotation" />
      ),
      cell: ({ row }) => {
        const value = String(row.getValue("rotation"));
        const isActive = value === "Active";

        return <Badge variant={isActive ? "success" : "soft"}>{value}</Badge>;
      },
    },
    {
      accessorKey: "priceCents",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => {
        const ad = row.original;

        return (
          <div className="flex flex-col gap-1 text-sm font-medium tabular-nums">
            <span>
              {ad.priceCents ? `$${(ad.priceCents / 100).toFixed(2)}` : "-"}
            </span>
            {ad.paidAt !== null && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Paid
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "startsAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Starts" />
      ),
      cell: ({ row }) => <Note>{formatDate(row.original.startsAt)}</Note>,
    },
    {
      accessorKey: "endsAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ends" />
      ),
      cell: ({ row }) => <Note>{formatDate(row.original.endsAt)}</Note>,
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <AdActions ad={row.original} />,
    },
  ];
};
