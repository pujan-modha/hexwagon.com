"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getRandomString, isValidUrl, slugify } from "@primoui/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useServerAction } from "zsa-react";
import { generateFavicon, uploadImageToS3 } from "~/actions/media";
import { Button } from "~/components/common/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form";
import { H3 } from "~/components/common/heading";
import { Icon } from "~/components/common/icon";
import { Input, inputVariants } from "~/components/common/input";
import { Link } from "~/components/common/link";
import { Note } from "~/components/common/note";
import { Stack } from "~/components/common/stack";
import { Switch } from "~/components/common/switch";
import { TextArea } from "~/components/common/textarea";
import { ExternalLink } from "~/components/web/external-link";
import { Markdown } from "~/components/web/markdown";
import { LICENSE_SUGGESTIONS } from "~/config/licenses";
import { siteConfig } from "~/config/site";
import { useComputedField } from "~/hooks/use-computed-field";
import { upsertTheme } from "~/server/admin/themes/actions";
import type { findThemeBySlug } from "~/server/admin/themes/queries";
import { themeSchema } from "~/server/admin/themes/schema";
import { cx } from "~/utils/cva";
import { PaletteGroupEditor } from "./palette-group-editor";
import { ThemeActions } from "./theme-actions";
import { ThemeMaintainersManager } from "./theme-maintainers-manager";

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg";

type ThemeFormProps = ComponentProps<"form"> & {
  theme?: Awaited<ReturnType<typeof findThemeBySlug>>;
};

export function ThemeForm({
  children,
  className,
  title,
  theme,
  ...props
}: ThemeFormProps) {
  const router = useRouter();
  const [isPreviewing, setIsPreviewing] = useState(false);

  const form = useForm({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      name: theme?.name ?? "",
      slug: theme?.slug ?? "",
      websiteUrl: theme?.websiteUrl ?? "",
      repositoryUrl: theme?.repositoryUrl ?? "",
      description: theme?.description ?? "",
      faviconUrl: theme?.faviconUrl ?? "",
      guidelines: theme?.guidelines ?? "",
      isFeatured: theme?.isFeatured ?? false,
      order: theme?.order ?? 0,
      license: theme?.license ?? "",
      palettes: (() => {
        if (!theme?.colors || theme.colors.length === 0) return [];

        // Group flat colors into palettes
        const groups: Record<string, any[]> = {};
        const sorted = [...theme.colors].sort((a, b) => a.order - b.order);
        for (const c of sorted) {
          const pName = (c as any).paletteName || "Default";
          if (!groups[pName]) groups[pName] = [];
          groups[pName].push({
            id: c.id,
            label: c.label,
            hex: c.hex,
            order: c.order,
          });
        }

        return Object.entries(groups).map(([name, colors]) => ({
          name,
          colors,
        }));
      })(),
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

  useComputedField({
    form,
    sourceField: "name",
    computedField: "slug",
    callback: slugify,
    enabled: !theme,
  });

  const [slug, websiteUrl] = form.watch(["slug", "websiteUrl"]);

  const upsertAction = useServerAction(upsertTheme, {
    onSuccess: ({ data }) => {
      toast.success(`Theme successfully ${theme ? "updated" : "created"}`);

      if (!theme || data.slug !== theme.slug) {
        router.push(`/admin/themes/${data.slug}`);
      }
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const faviconAction = useServerAction(generateFavicon, {
    onSuccess: ({ data }) => {
      form.setValue("faviconUrl", data);
    },
    onError: ({ err }) => toast.error(err.message),
  });

  const uploadImageAction = useServerAction(uploadImageToS3, {
    onSuccess: ({ data }) => {
      toast.success(
        "Image uploaded successfully. Please save the theme to update.",
      );
      form.setValue("faviconUrl", data, { shouldDirty: true });
    },
    onError: ({ err }) => toast.error(err.message),
  });

  useEffect(() => {
    const currentFaviconUrl = form.getValues("faviconUrl")?.trim();
    if (currentFaviconUrl) return;
    if (!isValidUrl(websiteUrl)) return;
    if (faviconAction.isPending || uploadImageAction.isPending) return;

    faviconAction.execute({
      url: websiteUrl,
      path: `themes/${slug || getRandomString(12)}`,
    });
  }, [
    form,
    slug,
    uploadImageAction.isPending,
    websiteUrl,
    faviconAction.isPending,
  ]);

  const handleSubmit = form.handleSubmit(
    (data) => {
      upsertAction.execute({ id: theme?.id, ...data });
    },
    (errors) => {
      console.error("Form Validation Failed:", errors);
      toast.error(
        "Please fill in all required fields. Check console for details.",
      );
    },
  );

  return (
    <Form {...form}>
      <div className="flex flex-col gap-6">
        <Stack className="justify-between">
          <H3 className="flex-1 truncate">{title}</H3>

          <Stack size="sm" className="-my-0.5">
            {theme && <ThemeActions theme={theme} className="ml-auto" />}
          </Stack>

          {theme && (
            <Note className="w-full">
              View:{" "}
              <ExternalLink
                href={`/themes/${theme.slug}`}
                className="text-primary underline"
              >
                {siteConfig.url}/themes/{theme.slug}
              </ExternalLink>
            </Note>
          )}
        </Stack>

        <form
          id="theme-create-form"
          onSubmit={handleSubmit}
          className={cx("grid gap-4 @sm:grid-cols-2", className)}
          noValidate
          {...props}
        >
          {theme && (
            <ThemeMaintainersManager
              themeId={theme.id}
              maintainers={theme.maintainers}
            />
          )}

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input data-1p-ignore {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input {...field} />
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
                  <Input
                    {...field}
                    list="theme-license-suggestions"
                    placeholder="MIT"
                  />
                </FormControl>
                <datalist id="theme-license-suggestions">
                  {LICENSE_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <Stack className="justify-between">
                  <FormLabel>Description</FormLabel>

                  {field.value && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsPreviewing((prev) => !prev)}
                      prefix={
                        <Icon
                          name={isPreviewing ? "lucide/pencil" : "lucide/eye"}
                        />
                      }
                      className="-my-1"
                    >
                      {isPreviewing ? "Edit" : "Preview"}
                    </Button>
                  )}
                </Stack>

                <FormControl>
                  {field.value && isPreviewing ? (
                    <Markdown
                      code={field.value}
                      className={cx(
                        inputVariants(),
                        "max-w-none border leading-normal",
                      )}
                    />
                  ) : (
                    <TextArea {...field} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guidelines"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Guidelines</FormLabel>
                <FormControl>
                  <TextArea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 @2xl:grid-cols-2">
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured</FormLabel>
                  <FormControl>
                    <Switch
                      onCheckedChange={field.onChange}
                      checked={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="faviconUrl"
              render={({ field }) => (
                <FormItem className="items-stretch">
                  <Stack className="justify-between">
                    <FormLabel className="flex-1">Favicon URL</FormLabel>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      prefix={
                        <Icon
                          name="lucide/refresh-cw"
                          className={cx(
                            faviconAction.isPending && "animate-spin",
                          )}
                        />
                      }
                      className="-my-1"
                      disabled={
                        !isValidUrl(websiteUrl) || faviconAction.isPending
                      }
                      onClick={() => {
                        faviconAction.execute({
                          url: websiteUrl,
                          path: `themes/${slug || getRandomString(12)}`,
                        });
                      }}
                    >
                      {field.value ? "Regenerate" : "Generate"}
                    </Button>
                  </Stack>

                  <Stack size="sm">
                    {field.value && (
                      <Image
                        src={field.value}
                        alt="Favicon"
                        width={32}
                        height={32}
                        className="size-8 border box-content rounded-md object-contain"
                      />
                    )}

                    <FormControl>
                      <Input type="url" className="flex-1" {...field} />
                    </FormControl>

                    <Input
                      type="file"
                      hover
                      accept={IMAGE_ACCEPT}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;

                        uploadImageAction.execute({
                          file,
                          path: `themes/${slug || getRandomString(12)}/favicon-upload`,
                        });

                        event.currentTarget.value = "";
                      }}
                    />

                    <Note className="text-xs">
                      Upload PNG, JPG, WebP, GIF, AVIF, or SVG. Max 8MB.
                    </Note>
                  </Stack>

                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Color Palettes Section */}
          <div className="flex flex-col gap-6 border-t pt-6 mt-6 col-span-full">
            <Stack className="justify-between">
              <H3>Color Palettes</H3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  appendPalette({
                    name: `Palette ${paletteFields.length + 1}`,
                    colors: [],
                  })
                }
                prefix={<Icon name="lucide/plus" />}
                className="-my-0.5"
              >
                Add palette
              </Button>
            </Stack>

            {paletteFields.length === 0 && (
              <p className="text-secondary-foreground text-[0.8125rem]">
                No palettes added yet. Click &quot;Add palette&quot; to begin.
              </p>
            )}

            <div className="flex flex-col gap-6">
              {paletteFields.map((paletteField, pIndex) => (
                <PaletteGroupEditor
                  key={paletteField.id}
                  form={form}
                  paletteIndex={pIndex}
                  removePalette={() => removePalette(pIndex)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-4 col-span-full pt-8">
            <Button size="md" variant="secondary" asChild>
              <Link href="/admin/themes">Cancel</Link>
            </Button>

            <Button
              type="submit"
              form="theme-create-form"
              size="md"
              isPending={upsertAction.isPending}
            >
              {theme ? "Update theme" : "Create theme"}
            </Button>
          </div>
        </form>
      </div>
    </Form>
  );
}
