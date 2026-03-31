"use client";

import { formatDate } from "@primoui/utils";
import { PortStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNowStrict } from "date-fns";
import { useQueryStates } from "nuqs";
import { use, useMemo } from "react";
import { Button } from "~/components/common/button";
import { Icon } from "~/components/common/icon";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import { DataTable } from "~/components/data-table/data-table";
import { DataTableColumnHeader } from "~/components/data-table/data-table-column-header";
import { DataTableLink } from "~/components/data-table/data-table-link";
import { DataTableToolbar } from "~/components/data-table/data-table-toolbar";
import { useDataTable } from "~/hooks/use-data-table";
import { canonicalPortHref } from "~/lib/catalogue";
import type { findTools } from "~/server/admin/tools/queries";
import { toolsTableParamsSchema } from "~/server/admin/tools/schema";
import type { DataTableFilterField } from "~/types";

type DashboardRow = Awaited<ReturnType<typeof findTools>>["ports"][number];

type DashboardTableProps = {
  toolsPromise: ReturnType<typeof findTools>;
};

export const DashboardTable = ({ toolsPromise }: DashboardTableProps) => {
  const { ports, pageCount } = use(toolsPromise) as {
    ports: DashboardRow[];
    pageCount: number;
  };
  const [{ perPage, sort }] = useQueryStates(toolsTableParamsSchema);

  // Memoize the columns so they don't re-render on every render
  const columns = useMemo((): ColumnDef<DashboardRow>[] => {
    return [
      {
        accessorKey: "name",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const { id, name, slug, status, theme, platform } =
            row.original;

          if (status === PortStatus.Draft) {
            return <Note className="font-medium">{name}</Note>;
          }

          return (
            <DataTableLink
              href={canonicalPortHref(theme.slug, platform.slug, id)}
              title={name ?? slug}
            />
          );
        },
      },
      {
        accessorKey: "publishedAt",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Published At" />
        ),
        cell: ({ row }) => {
          const { status, publishedAt } = row.original;

          switch (status) {
            case PortStatus.Published:
              return (
                <Stack size="sm" wrap={false}>
                  <Icon
                    name="lucide/circle"
                    className="stroke-3 text-green-600/75 dark:text-green-500/75"
                  />
                  <Note className="font-medium">
                    {formatDate(publishedAt!)}
                  </Note>
                </Stack>
              );
            case PortStatus.Scheduled:
              return (
                <Stack size="sm" wrap={false} title={formatDate(publishedAt!)}>
                  <Icon
                    name="lucide/circle-dot-dashed"
                    className="stroke-3 text-yellow-700/75 dark:text-yellow-500/75"
                  />
                  <Note className="font-medium">
                    Scheduled{" "}
                    {formatDistanceToNowStrict(publishedAt!, {
                      unit: "day",
                      roundingMethod: "ceil",
                      addSuffix: true,
                    })}
                  </Note>
                </Stack>
              );
            case PortStatus.Draft:
              return (
                <Stack size="sm" wrap={false}>
                  <Icon
                    name="lucide/circle-dashed"
                    className="stroke-3 text-muted-foreground/75"
                  />
                  <span className="text-muted-foreground/75">
                    Awaiting review
                  </span>
                </Stack>
              );
            default:
              return "";
          }
        },
      },
      {
        accessorKey: "pageviews",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Views (last 30d)" />
        ),
        cell: ({ row }) => (
          <Note>{row.getValue<number>("pageviews")?.toLocaleString()}</Note>
        ),
      },
      {
        accessorKey: "createdAt",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created At" />
        ),
        cell: ({ row }) => (
          <Note>{formatDate(row.getValue<Date>("createdAt"))}</Note>
        ),
      },
    ];
  }, []);

  // Search filters
  const filterFields: DataTableFilterField<any>[] = [
    {
      id: "name",
      label: "Name",
      placeholder: "Search by name...",
    },
  ];

  const { table } = useDataTable({
    data: ports as any,
    columns,
    pageCount,
    filterFields,
    shallow: false,
    clearOnDefault: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: perPage },
      sorting: sort,
      columnVisibility: { createdAt: false },
    },
    getRowId: (originalRow) => originalRow.slug,
  });

  return (
    <DataTable
      table={table}
      emptyState="No ports found. Submit or claim a port to get started."
    >
      <DataTableToolbar table={table} filterFields={filterFields}>
        <Button
          size="md"
          variant="primary"
          prefix={<Icon name="lucide/plus" />}
          asChild
        >
          <Link href="/submit">Submit a port</Link>
        </Button>
      </DataTableToolbar>
    </DataTable>
  );
};
