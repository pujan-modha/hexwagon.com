import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardMaintainerConsole } from "~/app/(web)/dashboard/maintainer/theme-console";
import { metadataConfig } from "~/config/metadata";
import { auth } from "~/lib/auth";
import { findMaintainedThemesForEditor } from "~/server/web/theme-maintainers/queries";

export const metadata: Metadata = {
  title: "Maintainer Console",
  description: "Manage maintained themes and their official ports.",
  openGraph: { ...metadataConfig.openGraph, url: "/dashboard/maintainer" },
  alternates: {
    ...metadataConfig.alternates,
    canonical: "/dashboard/maintainer",
  },
};

export default async function DashboardMaintainerPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw redirect("/auth/login?next=/dashboard/maintainer");
  }

  const themes = await findMaintainedThemesForEditor(session.user.id);

  return <DashboardMaintainerConsole themes={themes} />;
}
