"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { updateMaintainedTheme } from "~/actions/theme-maintainer";
import { Button } from "~/components/common/button";
import { Card } from "~/components/common/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form";
import { H3, H4 } from "~/components/common/heading";
import { Icon } from "~/components/common/icon";
import { Input } from "~/components/common/input";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import { TextArea } from "~/components/common/textarea";
import { Favicon } from "~/components/web/ui/favicon";
import { VerifiedBadge } from "~/components/web/verified-badge";
import { setOfficialPort, unsetOfficialPort } from "~/server/admin/ports/actions";
import { themePaletteSchema } from "~/server/admin/themes/schema";
import type { findMaintainedThemesForEditor } from "~/server/web/theme-maintainers/queries";
import { cx } from "~/utils/cva";

type MaintainedTheme = Awaited<
  ReturnType<typeof findMaintainedThemesForEditor>
>[number];

type DashboardMaintainerConsoleProps = {
  themes: MaintainedTheme[];
};

const formSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
  repositoryUrl: z.string().trim().url().optional().or(z.literal("")),
  faviconUrl: z.string().trim().url().optional().or(z.literal("")),
  license: z.string().trim().max(120).optional().or(z.literal("")),
  guidelines: z.string().trim().max(50_000).optional().or(z.literal("")),
  palettes: z.array(themePaletteSchema),
});

type FormValues = z.infer<typeof formSchema>;

const getStatusBadgeClassName = (status: string) => {
  if (status === "Published")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

  if (status === "Scheduled")
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";

  if (status === "PendingEdit")
    return "border-amber-500/40 bg-amber-500/10 text-amber-300";

  return "border-border bg-muted text-muted-foreground";
};

const groupPalettes = (theme: MaintainedTheme): FormValues["palettes"] => {
  const byPalette = new Map<
    string,
    Array<{ id?: string; label: string; hex: string; order: number }>
  >();

  for (const color of theme.colors) {
    const list = byPalette.get(color.paletteName) ?? [];

    list.push({
      id: color.id,
      label: color.label,
      hex: color.hex,
      order: color.order,
    });

    byPalette.set(color.paletteName, list);
  }

  return Array.from(byPalette.entries()).map(([name, colors]) => ({
    name,
    colors: colors.sort((a, b) => a.order - b.order),
  }));
};

const PaletteEditor = ({
  form,
  paletteIndex,
  removePalette,
}: {
  form: UseFormReturn<FormValues>;
  paletteIndex: number;
  removePalette: () => void;
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `palettes.${paletteIndex}.colors` as const,
  });

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Input
          {...form.register(`palettes.${paletteIndex}.name`)}
          placeholder="Palette name"
          className="max-w-sm"
        />

        <Button
          type="button"
          size="sm"
          variant="secondary"
          prefix={<Icon name="lucide/plus" />}
          onClick={() =>
            append({
              label: "",
              hex: "#000000",
              order: fields.length,
            })
          }
        >
          Color
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={removePalette}
        >
          Remove Palette
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, colorIndex) => {
          const hexPath = `palettes.${paletteIndex}.colors.${colorIndex}.hex` as const;
          const currentHex = form.watch(hexPath);
          const previewHex = /^#[0-9A-Fa-f]{6}$/.test(currentHex)
            ? currentHex
            : "#000000";

          return (
            <div
              key={field.id}
              className="grid grid-cols-[auto_7.5rem_minmax(0,1fr)_auto] items-center gap-2"
            >
              <div
                className="relative size-9 rounded-md border"
                style={{ backgroundColor: previewHex }}
              >
                <input
                  type="color"
                  value={previewHex}
                  onChange={(event) => form.setValue(hexPath, event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </div>

              <Input
                className="font-mono"
                placeholder="#000000"
                {...form.register(hexPath)}
              />

              <Input
                placeholder="Label"
                {...form.register(
                  `palettes.${paletteIndex}.colors.${colorIndex}.label` as const,
                )}
              />

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(colorIndex)}
              >
                <Icon name="lucide/trash" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ThemeEditorCard = ({ theme }: { theme: MaintainedTheme }) => {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: theme.name,
      description: theme.description ?? "",
      websiteUrl: theme.websiteUrl ?? "",
      repositoryUrl: theme.repositoryUrl ?? "",
      faviconUrl: theme.faviconUrl ?? "",
      license: theme.license ?? "",
      guidelines: theme.guidelines ?? "",
      palettes: groupPalettes(theme),
    },
  });

  const {
    fields: paletteFields,
    append: appendPalette,
    remove: removePalette,
  } = useFieldArray({
    control: form.control,
    name: "palettes",
  });

  const [pendingPortId, setPendingPortId] = useState<string | null>(null);

  const updateThemeAction = useServerAction(updateMaintainedTheme, {
    onSuccess: () => {
      toast.success("Theme updated.");
      router.refresh();
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const markOfficialAction = useServerAction(setOfficialPort, {
    onSuccess: () => {
      toast.success("Official port updated.");
      setPendingPortId(null);
      router.refresh();
    },
    onError: ({ err }) => {
      toast.error(err.message);
      setPendingPortId(null);
    },
  });

  const unmarkOfficialAction = useServerAction(unsetOfficialPort, {
    onSuccess: () => {
      toast.success("Official badge removed.");
      setPendingPortId(null);
      router.refresh();
    },
    onError: ({ err }) => {
      toast.error(err.message);
      setPendingPortId(null);
    },
  });

  const isPortsActionPending =
    markOfficialAction.isPending || unmarkOfficialAction.isPending;

  return (
    <Card className="gap-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Favicon src={theme.faviconUrl} title={theme.name} plain />

            <H3 className="inline-flex items-center gap-2.5">
              <span>{theme.name}</span>
              {theme._count.maintainers > 0 ? (
                <VerifiedBadge size="sm" className="-mb-[0.08em]" />
              ) : null}
            </H3>
          </div>

          <div className="text-sm text-muted-foreground">
            <span>{theme._count.ports} tracked ports</span>
            <span className="mx-2">·</span>
            <span>{theme._count.maintainers} maintainers</span>
          </div>

          <Note>
            Public page: <Link href={`/themes/${theme.slug}`}>/themes/{theme.slug}</Link>
          </Note>
        </div>

        <Button
          size="sm"
          isPending={updateThemeAction.isPending}
          onClick={form.handleSubmit((values) =>
            updateThemeAction.execute({
              themeId: theme.id,
              ...values,
            }),
          )}
        >
          Save Theme Changes
        </Button>
      </div>

      <Form {...form}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="license"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="MIT" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repositoryUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repository URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://github.com/..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="faviconUrl"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Favicon URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://.../favicon.png" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <TextArea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guidelines"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Theme Guidelines</FormLabel>
                <FormControl>
                  <TextArea {...field} rows={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>

      <div className="space-y-3 border-t border-border/70 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <H4 as="h3" className="text-base">
            Color Palettes
          </H4>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            prefix={<Icon name="lucide/plus" />}
            onClick={() =>
              appendPalette({
                name: `Palette ${paletteFields.length + 1}`,
                colors: [],
              })
            }
          >
            Add Palette
          </Button>
        </div>

        {paletteFields.length > 0 ? (
          <div className="space-y-3">
            {paletteFields.map((paletteField, paletteIndex) => (
              <PaletteEditor
                key={paletteField.id}
                form={form}
                paletteIndex={paletteIndex}
                removePalette={() => removePalette(paletteIndex)}
              />
            ))}
          </div>
        ) : (
          <Note>No palettes configured yet.</Note>
        )}
      </div>

      <div className="space-y-3 border-t border-border/70 pt-5">
        <div className="flex items-center justify-between gap-2">
          <H4 as="h3" className="text-base">
            Theme Ports
          </H4>
          <span className="text-xs text-muted-foreground">
            Mark or unmark official ports per platform.
          </span>
        </div>

        {theme.ports.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Port</th>
                  <th className="px-3 py-2 text-left">Platform</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Official</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {theme.ports.map((port) => {
                  const isPending = isPortsActionPending && pendingPortId === port.id;

                  return (
                    <tr key={port.id} className="border-t border-border/60">
                      <td className="px-3 py-2">
                        <Link href={`/themes/${theme.slug}/${port.platform.slug}/${port.id}`}>
                          {port.name ?? `${theme.name} for ${port.platform.name}`}
                        </Link>
                      </td>

                      <td className="px-3 py-2 text-muted-foreground">{port.platform.name}</td>

                      <td className="px-3 py-2">
                        <span
                          className={cx(
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            getStatusBadgeClassName(port.status),
                          )}
                        >
                          {port.status}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        {port.isOfficial ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <VerifiedBadge size="sm" className="-mb-[0.02em]" />
                            Official
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {port.isOfficial ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            isPending={isPending}
                            disabled={isPortsActionPending && !isPending}
                            onClick={() => {
                              setPendingPortId(port.id);
                              unmarkOfficialAction.execute({ portId: port.id });
                            }}
                          >
                            Unmark Official
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            isPending={isPending}
                            disabled={isPortsActionPending && !isPending}
                            onClick={() => {
                              setPendingPortId(port.id);
                              markOfficialAction.execute({ portId: port.id });
                            }}
                          >
                            Mark Official
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Note>No ports are available for this theme yet.</Note>
        )}
      </div>
    </Card>
  );
};

export const DashboardMaintainerConsole = ({
  themes,
}: DashboardMaintainerConsoleProps) => {
  return (
    <section className="mt-2 space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Maintainer Console</h2>
        <p className="text-sm text-muted-foreground">
          Full theme management for maintainers. You can edit theme details, guidelines, color palettes, and official port state.
        </p>
      </div>

      {themes.length > 0 ? (
        <div className="space-y-5">
          {themes.map((theme) => (
            <ThemeEditorCard key={theme.id} theme={theme} />
          ))}
        </div>
      ) : (
        <Card>
          <Note>
            You are not assigned as a maintainer for any theme yet.
          </Note>
        </Card>
      )}
    </section>
  );
};
