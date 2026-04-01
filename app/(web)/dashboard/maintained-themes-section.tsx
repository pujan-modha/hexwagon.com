"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { updateMaintainedTheme } from "~/actions/theme-maintainer";
import { Button } from "~/components/common/button";
import { Card, CardHeader } from "~/components/common/card";
import { H4, H5 } from "~/components/common/heading";
import { Input } from "~/components/common/input";
import { Label } from "~/components/common/label";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import { TextArea } from "~/components/common/textarea";
import { Favicon } from "~/components/web/ui/favicon";
import { VerifiedBadge } from "~/components/web/verified-badge";
import { setOfficialPort } from "~/server/admin/ports/actions";
import type { findMaintainedThemes } from "~/server/web/theme-maintainers/queries";

type MaintainedTheme = Awaited<ReturnType<typeof findMaintainedThemes>>[number];

type MaintainedThemesSectionProps = {
  themes: MaintainedTheme[];
};

type ThemeFormValues = {
  name: string;
  description: string;
  websiteUrl: string;
  repositoryUrl: string;
  guidelines: string;
  license: string;
};

const groupPortsByPlatform = (theme: MaintainedTheme) => {
  const grouped = new Map<
    string,
    Array<{
      id: string;
      slug: string;
      name: string | null;
      isOfficial: boolean;
      platform: { name: string; slug: string };
    }>
  >();

  for (const port of theme.ports) {
    const key = port.platform.slug;
    const existing = grouped.get(key) ?? [];
    existing.push(port);
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((ports) =>
      [...ports].sort((a, b) => {
        if (a.isOfficial !== b.isOfficial) {
          return a.isOfficial ? -1 : 1;
        }

        return (a.name ?? "").localeCompare(b.name ?? "");
      }),
    )
    .sort((a, b) => a[0].platform.name.localeCompare(b[0].platform.name));
};

const ManagedThemeCard = ({ theme }: { theme: MaintainedTheme }) => {
  const router = useRouter();
  const [values, setValues] = useState<ThemeFormValues>({
    name: theme.name,
    description: theme.description ?? "",
    websiteUrl: theme.websiteUrl ?? "",
    repositoryUrl: theme.repositoryUrl ?? "",
    guidelines: theme.guidelines ?? "",
    license: theme.license ?? "",
  });
  const [pendingOfficialPortId, setPendingOfficialPortId] = useState<
    string | null
  >(null);

  const groupedPorts = useMemo(() => groupPortsByPlatform(theme), [theme]);

  const updateThemeAction = useServerAction(updateMaintainedTheme, {
    onSuccess: () => {
      toast.success("Theme details updated.");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const markOfficialAction = useServerAction(setOfficialPort, {
    onSuccess: () => {
      toast.success("Official port updated.");
      setPendingOfficialPortId(null);
      router.refresh();
    },
    onError: ({ err }) => {
      toast.error(err.message);
      setPendingOfficialPortId(null);
    },
  });

  return (
    <Card className="gap-5">
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2.5">
          <Favicon src={theme.faviconUrl} title={theme.name} plain />

          <H4 as="h3" className="inline-flex items-center gap-2.5">
            <span>{theme.name}</span>
            {theme._count.maintainers > 0 ? (
              <VerifiedBadge size="sm" className="-mb-[0.05em]" />
            ) : null}
          </H4>
        </div>

        <div className="text-xs text-muted-foreground">
          {theme._count.maintainers} maintainer
          {theme._count.maintainers === 1 ? "" : "s"} · {theme._count.ports}{" "}
          published port{theme._count.ports === 1 ? "" : "s"}
        </div>
      </CardHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`theme-name-${theme.id}`}>Name</Label>
          <Input
            id={`theme-name-${theme.id}`}
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`theme-license-${theme.id}`}>License</Label>
          <Input
            id={`theme-license-${theme.id}`}
            value={values.license}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                license: event.target.value,
              }))
            }
            placeholder="MIT"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`theme-website-${theme.id}`}>Website URL</Label>
          <Input
            id={`theme-website-${theme.id}`}
            type="url"
            value={values.websiteUrl}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                websiteUrl: event.target.value,
              }))
            }
            placeholder="https://example.com"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`theme-repo-${theme.id}`}>Repository URL</Label>
          <Input
            id={`theme-repo-${theme.id}`}
            type="url"
            value={values.repositoryUrl}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                repositoryUrl: event.target.value,
              }))
            }
            placeholder="https://github.com/..."
          />
        </div>

        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor={`theme-description-${theme.id}`}>Description</Label>
          <TextArea
            id={`theme-description-${theme.id}`}
            rows={3}
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>

        <div className="grid gap-1.5 md:col-span-2">
          <Label htmlFor={`theme-guidelines-${theme.id}`}>Guidelines</Label>
          <TextArea
            id={`theme-guidelines-${theme.id}`}
            rows={6}
            value={values.guidelines}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                guidelines: event.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Note>
          Public page:{" "}
          <Link href={`/themes/${theme.slug}`}>{`/themes/${theme.slug}`}</Link>
        </Note>

        <Button
          size="sm"
          isPending={updateThemeAction.isPending}
          onClick={() =>
            updateThemeAction.execute({
              themeId: theme.id,
              ...values,
            })
          }
        >
          Save Theme
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <H5 className="text-sm">Official Ports</H5>

        {groupedPorts.length > 0 ? (
          groupedPorts.map((ports) => {
            const platform = ports[0].platform;

            return (
              <div key={platform.slug} className="grid gap-2.5">
                <div className="text-xs font-medium text-muted-foreground">
                  {platform.name}
                </div>

                <div className="grid gap-2">
                  {ports.map((port) => (
                    <div
                      key={port.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <Link
                        href={`/themes/${theme.slug}/${platform.slug}/${port.id}`}
                      >
                        {port.name ?? `${theme.name} for ${platform.name}`}
                      </Link>

                      {port.isOfficial ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                          <VerifiedBadge size="sm" className="-mb-0" />
                          Official
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            markOfficialAction.isPending &&
                            pendingOfficialPortId !== port.id
                          }
                          isPending={
                            markOfficialAction.isPending &&
                            pendingOfficialPortId === port.id
                          }
                          onClick={() => {
                            setPendingOfficialPortId(port.id);
                            markOfficialAction.execute({ portId: port.id });
                          }}
                        >
                          Mark Official
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <Note>No published ports yet for this theme.</Note>
        )}
      </div>
    </Card>
  );
};

export const DashboardMaintainedThemesSection = ({
  themes,
}: MaintainedThemesSectionProps) => {
  return (
    <section className="mt-10 space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Maintained Themes
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update theme metadata and choose the official port per platform.
        </p>
      </div>

      {themes.length > 0 ? (
        <div className="grid gap-4">
          {themes.map((theme) => (
            <ManagedThemeCard key={theme.id} theme={theme} />
          ))}
        </div>
      ) : (
        <Note>
          You are not assigned as a maintainer for any theme yet. Claim a theme
          to manage it here.
        </Note>
      )}
    </section>
  );
};
