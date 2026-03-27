import type { Prisma } from "@prisma/client";
import type { SearchParams } from "nuqs/server";
import { Card } from "~/components/common/card";
import { Link } from "~/components/common/link";
import { filterParamsCache } from "~/server/web/shared/schema";
import { searchPorts } from "~/server/web/ports/queries";

type ToolQueryProps = {
  searchParams: Promise<SearchParams>;
  where?: Prisma.PortWhereInput;
  search?: {
    placeholder?: string;
  };
};

export const ToolQuery = async ({ searchParams, where }: ToolQueryProps) => {
  const parsedSearchParams = await filterParamsCache.parse(await searchParams);
  const { ports } = await searchPorts(parsedSearchParams, where);

  if (!ports.length) {
    return (
      <Card className="p-6 text-muted-foreground">No ports found yet.</Card>
    );
  }

  return (
    <div className="grid gap-4">
      {ports.map((port) => (
        <Card key={port.id} className="p-5">
          <Link
            href={`/themes/${port.theme.slug}/${port.platform.slug}/${port.id}`}
            className="font-semibold"
          >
            {port.name ?? `${port.theme.name} for ${port.platform.name}`}
          </Link>

          {port.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {port.description}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
};
