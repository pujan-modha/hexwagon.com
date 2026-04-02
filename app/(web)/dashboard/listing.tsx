import { PortStatus } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { DashboardPageProps } from "~/app/(web)/dashboard/page";
import { DashboardLikedSection } from "~/app/(web)/dashboard/liked-section";
import { Button } from "~/components/common/button";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import { DashboardTable } from "~/app/(web)/dashboard/table";
import { DataTableSkeleton } from "~/components/data-table/data-table-skeleton";
import { auth } from "~/lib/auth";
import { findTools } from "~/server/admin/tools/queries";
import { toolsTableParamsCache } from "~/server/admin/tools/schema";
import { findUserLikedEntities } from "~/server/web/likes/queries";

export const DashboardToolListing = async ({
  searchParams,
}: DashboardPageProps) => {
  const parsedParams = toolsTableParamsCache.parse(await searchParams);
  const session = await auth.api.getSession({ headers: await headers() });
  const status = [
    PortStatus.Draft,
    PortStatus.Scheduled,
    PortStatus.Published,
    PortStatus.PendingEdit,
  ];

  if (!session?.user) {
    throw redirect("/auth/login?next=/dashboard");
  }

  const toolsPromise = findTools(
    { ...parsedParams, status: status },
    {
      OR: [
        { submitterEmail: session.user.email },
        { authorId: session.user.id },
      ],
    },
  );
  const liked = await findUserLikedEntities(session.user.id);

  return (
    <>
      <Suspense fallback={<DataTableSkeleton />}>
        <DashboardTable toolsPromise={toolsPromise} />
      </Suspense>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Theme Maintainer Controls
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the dedicated maintainer console for full theme editing and official port management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" asChild>
            <Link href="/dashboard/maintainer">Open Maintainer Console</Link>
          </Button>
          <Note>Includes palette editing and mark/unmark official controls.</Note>
        </div>
      </section>

      <DashboardLikedSection liked={liked} />
    </>
  );
};
