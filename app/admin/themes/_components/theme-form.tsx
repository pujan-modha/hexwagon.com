"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { getRandomString, isValidUrl, slugify } from "@primoui/utils"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { generateFavicon, uploadImageToS3 } from "~/actions/media"
import { Button } from "~/components/common/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form"
import { H3 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Input, inputVariants } from "~/components/common/input"
import { Link } from "~/components/common/link"
import { Note } from "~/components/common/note"
import { Stack } from "~/components/common/stack"
import { Switch } from "~/components/common/switch"
import { TextArea } from "~/components/common/textarea"
import { ExternalLink } from "~/components/web/external-link"
import { Markdown } from "~/components/web/markdown"
import { LICENSE_SUGGESTIONS } from "~/config/licenses"
import { siteConfig } from "~/config/site"
import { useComputedField } from "~/hooks/use-computed-field"
import { upsertTheme } from "~/server/admin/themes/actions"
import type { findThemeBySlug } from "~/server/admin/themes/queries"
import type { ThemeSchema } from "~/server/admin/themes/schema"
import { themeSchema } from "~/server/admin/themes/schema"
import { cx } from "~/utils/cva"
import { PaletteGroupEditor } from "./palette-group-editor"
import { ThemeActions } from "./theme-actions"
import { ThemeMaintainersManager } from "./theme-maintainers-manager"

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg"

type ThemeFormProps = ComponentProps<"form"> & {
  theme?: Awaited<ReturnType<typeof findThemeBySlug>>
}

type PaletteColorInput = NonNullable<ThemeSchema["palettes"]>[number]["colors"][number]
type PaletteInput = NonNullable<ThemeSchema["palettes"]>[number]

const normalizePaletteName = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

const normalizePaletteColor = (
  entry: unknown,
  fallbackLabel: string,
  order: number,
): PaletteColorInput | null => {
  if (!entry || typeof entry !== "object") return null

  const labelValue =
    "label" in entry && typeof entry.label === "string"
      ? entry.label
      : "name" in entry && typeof entry.name === "string"
        ? entry.name
        : fallbackLabel
  const hexValue =
    "hex" in entry && typeof entry.hex === "string"
      ? entry.hex
      : "value" in entry && typeof entry.value === "string"
        ? entry.value
        : "color" in entry && typeof entry.color === "string"
          ? entry.color
          : null

  if (!hexValue) return null

  const normalizedHex = hexValue.startsWith("#") ? hexValue.toUpperCase() : `#${hexValue.toUpperCase()}`

  if (!/^#[0-9A-F]{6}$/.test(normalizedHex)) return null

  return {
    label: labelValue.trim() || fallbackLabel,
    hex: normalizedHex,
    order,
  }
}

const normalizePaletteFromObject = (name: string, value: unknown): PaletteInput | null => {
  if (!value || typeof value !== "object") return null

  const colors = Object.entries(value)
    .map(([label, hex], index) => normalizePaletteColor({ label, hex }, label, index))
    .filter((color): color is PaletteColorInput => Boolean(color))

  if (colors.length === 0) return null

  return {
    name: normalizePaletteName(name, "Imported Palette"),
    colors,
  }
}

const normalizePalette = (entry: unknown, index: number): PaletteInput | null => {
  if (!entry || typeof entry !== "object") return null

  const paletteEntry = entry as Record<string, unknown>
  const paletteName = normalizePaletteName(
    paletteEntry.name ?? paletteEntry.paletteName,
    `Imported Palette ${index + 1}`,
  )

  if (Array.isArray(paletteEntry.colors)) {
    const colors = paletteEntry.colors
      .map((colorEntry, colorIndex) =>
        normalizePaletteColor(colorEntry, `Color ${colorIndex + 1}`, colorIndex),
      )
      .filter((color): color is PaletteColorInput => Boolean(color))

    return colors.length > 0 ? { name: paletteName, colors } : null
  }

  if (paletteEntry.colors && typeof paletteEntry.colors === "object") {
    return normalizePaletteFromObject(paletteName, paletteEntry.colors)
  }

  return normalizePaletteFromObject(paletteName, paletteEntry)
}

const parsePaletteImport = (value: string): PaletteInput[] => {
  const parsed = JSON.parse(value) as unknown

  const paletteSource =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && "palettes" in parsed
      ? (parsed as { palettes?: unknown }).palettes
      : parsed

  if (Array.isArray(paletteSource)) {
    const palettes = paletteSource
      .map((entry, index) => normalizePalette(entry, index))
      .filter((palette): palette is PaletteInput => Boolean(palette))

    if (palettes.length > 0) return palettes
  }

  if (paletteSource && typeof paletteSource === "object") {
    const palettes = Object.entries(paletteSource)
      .map(([name, paletteValue], index) => {
        if (
          paletteValue &&
          typeof paletteValue === "object" &&
          !Array.isArray(paletteValue) &&
          ("colors" in paletteValue || "name" in paletteValue || "paletteName" in paletteValue)
        ) {
          return normalizePalette({ name, ...(paletteValue as Record<string, unknown>) }, index)
        }

        return normalizePaletteFromObject(name, paletteValue)
      })
      .filter((palette): palette is PaletteInput => Boolean(palette))

    if (palettes.length > 0) return palettes
  }

  throw new Error(
    "Unsupported JSON format. Use either { palettes: [...] }, an array of palette objects, or an object keyed by palette name.",
  )
}

const clonePalette = (palette: PaletteInput, index: number): PaletteInput => ({
  name: `${palette.name} Copy${index > 0 ? ` ${index + 1}` : ""}`,
  colors: palette.colors.map((color, colorIndex) => ({
    label: color.label,
    hex: color.hex,
    order: colorIndex,
  })),
})

export function ThemeForm({ children, className, title, theme, ...props }: ThemeFormProps) {
  const router = useRouter()
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImportingPalettes, setIsImportingPalettes] = useState(false)
  const [paletteImportJson, setPaletteImportJson] = useState("")

  const form = useForm({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      name: theme?.name ?? "",
      slug: theme?.slug ?? "",
      seoTitle: theme?.seoTitle ?? "",
      seoDescription: theme?.seoDescription ?? "",
      seoIntro: theme?.seoIntro ?? "",
      seoFaqs: theme?.seoFaqs ?? "",
      searchAliases: theme?.searchAliases ?? "",
      seoPlatformOverrides: theme?.seoPlatformOverrides ?? "",
      websiteUrl: theme?.websiteUrl ?? "",
      repositoryUrl: theme?.repositoryUrl ?? "",
      description: theme?.description ?? "",
      faviconUrl: theme?.faviconUrl ?? "",
      guidelines: theme?.guidelines ?? "",
      isFeatured: theme?.isFeatured ?? false,
      order: theme?.order ?? 0,
      license: theme?.license ?? "",
      palettes: (() => {
        if (!theme?.colors || theme.colors.length === 0) return []

        // Group flat colors into palettes
        const groups: Record<string, any[]> = {}
        const sorted = [...theme.colors].sort((a, b) => a.order - b.order)
        for (const c of sorted) {
          const pName = (c as any).paletteName || "Default"
          if (!groups[pName]) groups[pName] = []
          groups[pName].push({
            id: c.id,
            label: c.label,
            hex: c.hex,
            order: c.order,
          })
        }

        return Object.entries(groups).map(([name, colors]) => ({
          name,
          colors,
        }))
      })(),
    },
  })

  const {
    fields: paletteFields,
    append: appendPalette,
    insert: insertPalette,
    remove: removePalette,
    replace: replacePalettes,
  } = useFieldArray({
    control: form.control,
    name: "palettes",
  })

  useComputedField({
    form,
    sourceField: "name",
    computedField: "slug",
    callback: slugify,
    enabled: !theme,
  })

  const [slug, websiteUrl] = form.watch(["slug", "websiteUrl"])

  const upsertAction = useServerAction(upsertTheme, {
    onSuccess: ({ data }) => {
      toast.success(`Theme successfully ${theme ? "updated" : "created"}`)

      if (!theme || data.slug !== theme.slug) {
        router.push(`/admin/themes/${data.slug}`)
      }
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const faviconAction = useServerAction(generateFavicon, {
    onSuccess: ({ data }) => {
      form.setValue("faviconUrl", data)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const uploadImageAction = useServerAction(uploadImageToS3, {
    onSuccess: ({ data }) => {
      toast.success("Image uploaded successfully. Please save the theme to update.")
      form.setValue("faviconUrl", data, { shouldDirty: true })
    },
    onError: ({ err }) => toast.error(err.message),
  })

  useEffect(() => {
    const currentFaviconUrl = form.getValues("faviconUrl")?.trim()
    if (currentFaviconUrl) return
    if (!isValidUrl(websiteUrl)) return
    if (faviconAction.isPending || uploadImageAction.isPending) return

    faviconAction.execute({
      url: websiteUrl,
      path: `themes/${slug || getRandomString(12)}`,
    })
  }, [form, slug, uploadImageAction.isPending, websiteUrl, faviconAction.isPending])

  const handleSubmit = form.handleSubmit(
    data => {
      upsertAction.execute({ id: theme?.id, ...data })
    },
    errors => {
      console.error("Form Validation Failed:", errors)
      toast.error("Please fill in all required fields. Check console for details.")
    },
  )

  const handleDuplicatePalette = (paletteIndex: number) => {
    const palette = form.getValues(`palettes.${paletteIndex}`)

    if (!palette) return

    insertPalette(paletteIndex + 1, clonePalette(palette, 0))
    toast.success(`Duplicated ${palette.name}`)
  }

  const importPalettes = (mode: "append" | "replace") => {
    try {
      const importedPalettes = parsePaletteImport(paletteImportJson)

      if (importedPalettes.length === 0) {
        toast.error("No valid palettes found in that JSON.")
        return
      }

      if (mode === "replace") {
        replacePalettes(importedPalettes)
      } else {
        appendPalette(importedPalettes)
      }

      setPaletteImportJson("")
      setIsImportingPalettes(false)
      toast.success(
        `${mode === "replace" ? "Replaced" : "Imported"} ${importedPalettes.length} palette${importedPalettes.length === 1 ? "" : "s"}.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid palette JSON.")
    }
  }

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
              <ExternalLink href={`/themes/${theme.slug}`} className="text-primary underline">
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
          {theme && <ThemeMaintainersManager themeId={theme.id} maintainers={theme.maintainers} />}

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
                  <Input {...field} list="theme-license-suggestions" placeholder="MIT" />
                </FormControl>
                <datalist id="theme-license-suggestions">
                  {LICENSE_SUGGESTIONS.map(option => (
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
                      onClick={() => setIsPreviewing(prev => !prev)}
                      prefix={<Icon name={isPreviewing ? "lucide/pencil" : "lucide/eye"} />}
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
                      className={cx(inputVariants(), "max-w-none border leading-normal")}
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
                    <Switch onCheckedChange={field.onChange} checked={field.value} />
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
                          className={cx(faviconAction.isPending && "animate-spin")}
                        />
                      }
                      className="-my-1"
                      disabled={!isValidUrl(websiteUrl) || faviconAction.isPending}
                      onClick={() => {
                        faviconAction.execute({
                          url: websiteUrl,
                          path: `themes/${slug || getRandomString(12)}`,
                        })
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
                      onChange={event => {
                        const file = event.target.files?.[0]
                        if (!file) return

                        uploadImageAction.execute({
                          file,
                          path: `themes/${slug || getRandomString(12)}/favicon-upload`,
                        })

                        event.currentTarget.value = ""
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
              <Stack size="sm" className="-my-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsImportingPalettes(prev => !prev)}
                  prefix={<Icon name={isImportingPalettes ? "lucide/x" : "lucide/sparkles"} />}
                >
                  {isImportingPalettes ? "Close import" : "Import JSON"}
                </Button>
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
                >
                  Add palette
                </Button>
              </Stack>
            </Stack>

            {isImportingPalettes ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <Stack direction="column" size="sm" className="items-stretch">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Paste palette JSON</p>
                    <p className="text-xs text-secondary-foreground">
                      Supports `{`}"palettes": [...]{`}``, a raw array of palettes, or an object
                      keyed by palette name.
                    </p>
                  </div>

                  <TextArea
                    value={paletteImportJson}
                    onChange={event => setPaletteImportJson(event.target.value)}
                    placeholder={`{\n  "palettes": [\n    {\n      "name": "Mocha",\n      "colors": [\n        { "label": "Base", "hex": "#1E1E2E" }\n      ]\n    }\n  ]\n}`}
                    className="min-h-56 font-mono text-xs"
                  />

                  <Stack size="sm" className="justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => importPalettes("append")}
                    >
                      Append palettes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => importPalettes("replace")}
                    >
                      Replace all palettes
                    </Button>
                  </Stack>
                </Stack>
              </div>
            ) : null}

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
                  duplicatePalette={() => handleDuplicatePalette(pIndex)}
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
  )
}
