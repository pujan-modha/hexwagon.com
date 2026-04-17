"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { getRandomString, isValidUrl, slugify } from "@primoui/utils"
import { ConfigStatus } from "@prisma/client"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { use, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { generateFavicon, uploadImageToS3 } from "~/actions/media"
import { RelationSelector } from "~/components/admin/relation-selector"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"
import { Stack } from "~/components/common/stack"
import { Switch } from "~/components/common/switch"
import { TextArea } from "~/components/common/textarea"
import { ExternalLink } from "~/components/web/external-link"
import { Markdown } from "~/components/web/markdown"
import { LICENSE_SUGGESTIONS } from "~/config/licenses"
import { siteConfig } from "~/config/site"
import { useComputedField } from "~/hooks/use-computed-field"
import { upsertConfig } from "~/server/admin/configs/actions"
import type { findConfigBySlug } from "~/server/admin/configs/queries"
import { configSchema } from "~/server/admin/configs/schema"
import type { findPlatformList } from "~/server/admin/platforms/queries"
import type { findThemeList } from "~/server/admin/themes/queries"
import { cx } from "~/utils/cva"
import { ConfigActions } from "./config-actions"

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg"

type ConfigFormProps = ComponentProps<"form"> & {
  config?: Awaited<ReturnType<typeof findConfigBySlug>>
  platformsPromise: ReturnType<typeof findPlatformList>
  themesPromise: ReturnType<typeof findThemeList>
}

export function ConfigForm({
  children,
  className,
  title,
  config,
  platformsPromise,
  themesPromise,
  ...props
}: ConfigFormProps) {
  const router = useRouter()
  const platforms = use(platformsPromise)
  const themes = use(themesPromise)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const form = useForm({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: config?.name ?? "",
      slug: config?.slug ?? "",
      seoTitle: config?.seoTitle ?? "",
      seoDescription: config?.seoDescription ?? "",
      seoFaqs: config?.seoFaqs ?? "",
      searchAliases: config?.searchAliases ?? "",
      description: config?.description ?? "",
      content: config?.content ?? "",
      repositoryUrl: config?.repositoryUrl ?? "",
      websiteUrl: config?.websiteUrl ?? "",
      screenshotUrl: config?.screenshotUrl ?? "",
      faviconUrl: config?.faviconUrl ?? "",
      submitterNote: config?.submitterNote ?? "",
      isFeatured: config?.isFeatured ?? false,
      order: config?.order ?? 0,
      license: config?.license ?? "",
      status: config?.status ?? ConfigStatus.Draft,
      themeIds: config?.configThemes.map(entry => entry.themeId) ?? [],
      platformIds: config?.configPlatforms.map(entry => entry.platformId) ?? [],
    },
  })

  useComputedField({
    form,
    sourceField: "name",
    computedField: "slug",
    callback: slugify,
    enabled: !config,
  })

  const [slug, websiteUrl, repositoryUrl, content] = form.watch([
    "slug",
    "websiteUrl",
    "repositoryUrl",
    "content",
  ])

  const upsertAction = useServerAction(upsertConfig, {
    onSuccess: ({ data }) => {
      toast.success(`Config successfully ${config ? "updated" : "created"}`)

      if (!config || data.slug !== config.slug) {
        router.push(`/admin/configs/${data.slug}`)
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
      toast.success("Image uploaded successfully. Please save the config to update.")
      form.setValue("faviconUrl", data, { shouldDirty: true })
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const uploadScreenshotAction = useServerAction(uploadImageToS3, {
    onSuccess: ({ data }) => {
      toast.success("Screenshot uploaded successfully. Please save the config to update.")
      form.setValue("screenshotUrl", data, { shouldDirty: true })
    },
    onError: ({ err }) => toast.error(err.message),
  })

  useEffect(() => {
    const currentFaviconUrl = form.getValues("faviconUrl")?.trim()
    const faviconSource = websiteUrl || repositoryUrl
    if (currentFaviconUrl) return
    if (!isValidUrl(faviconSource)) return
    if (faviconAction.isPending || uploadImageAction.isPending) return

    faviconAction.execute({
      url: faviconSource,
      path: `configs/${slug || getRandomString(12)}`,
    })
  }, [form, slug, websiteUrl, repositoryUrl, faviconAction.isPending, uploadImageAction.isPending])

  const handleSubmit = form.handleSubmit(data => {
    upsertAction.execute({ id: config?.id, ...data })
  })

  return (
    <Form {...form}>
      <Stack className="justify-between">
        <H3 className="flex-1 truncate">{title}</H3>

        <Stack size="sm" className="-my-0.5">
          {config ? <ConfigActions config={config} className="ml-auto" /> : null}
        </Stack>

        {config ? (
          <Note className="w-full">
            View:{" "}
            <ExternalLink href={`/configs/${config.slug}`} className="text-primary underline">
              {siteConfig.url}/configs/{config.slug}
            </ExternalLink>
          </Note>
        ) : null}
      </Stack>

      <form
        onSubmit={handleSubmit}
        className={cx("grid gap-4 @sm:grid-cols-2", className)}
        noValidate
        {...props}
      >
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
                <Input {...field} list="config-license-suggestions" placeholder="MIT" />
              </FormControl>
              <datalist id="config-license-suggestions">
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(ConfigStatus).map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Input {...field} type="number" inputMode="numeric" min={0} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <TextArea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <Stack className="justify-between">
                <FormLabel>Content</FormLabel>

                {field.value ? (
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
                ) : null}
              </Stack>

              <FormControl>
                {field.value && isPreviewing ? (
                  <Markdown
                    code={field.value}
                    className={cx(inputVariants(), "max-w-none border leading-normal")}
                  />
                ) : (
                  <TextArea {...field} rows={10} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="submitterNote"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Submitter Note</FormLabel>
              <FormControl>
                <TextArea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="themeIds"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Themes</FormLabel>
              <FormControl>
                <RelationSelector
                  relations={themes}
                  selectedIds={field.value}
                  setSelectedIds={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="platformIds"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Platforms</FormLabel>
              <FormControl>
                <RelationSelector
                  relations={platforms}
                  selectedIds={field.value}
                  setSelectedIds={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="searchAliases"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Search Aliases</FormLabel>
              <FormControl>
                <TextArea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seoTitle"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>SEO Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seoDescription"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>SEO Description</FormLabel>
              <FormControl>
                <TextArea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seoFaqs"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>SEO FAQs (JSON)</FormLabel>
              <FormControl>
                <TextArea {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="faviconUrl"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Favicon URL</FormLabel>
              <FormControl>
                <Stack className="items-start sm:items-center">
                  <Input {...field} className="flex-1" />

                  <Stack size="sm" wrap={false}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() =>
                        faviconAction.execute({
                          url: websiteUrl || repositoryUrl,
                          path: `configs/${slug || getRandomString(12)}/favicon`,
                        })
                      }
                      disabled={!isValidUrl(websiteUrl || repositoryUrl)}
                    >
                      Generate
                    </Button>

                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="hidden"
                        onChange={event => {
                          const file = event.target.files?.[0]
                          if (!file) return

                          uploadImageAction.execute({
                            file,
                            path: `configs/${slug || getRandomString(12)}/favicon-upload`,
                          })
                          event.currentTarget.value = ""
                        }}
                      />
                      <span className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium">
                        Upload
                      </span>
                    </label>
                  </Stack>
                </Stack>
              </FormControl>

              {field.value ? (
                <div className="mt-3 flex items-center gap-3">
                  <Image
                    src={field.value}
                    alt="Config favicon preview"
                    width={48}
                    height={48}
                    className="rounded-md border bg-background object-contain"
                  />
                  <Note>Preview updates after save if image is reprocessed.</Note>
                </div>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="screenshotUrl"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Screenshot URL</FormLabel>
              <FormControl>
                <Stack className="items-start sm:items-center">
                  <Input {...field} className="flex-1" />

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={IMAGE_ACCEPT}
                      className="hidden"
                      onChange={event => {
                        const file = event.target.files?.[0]
                        if (!file) return

                        uploadScreenshotAction.execute({
                          file,
                          path: `configs/${slug || getRandomString(12)}/screenshot-upload`,
                        })
                        event.currentTarget.value = ""
                      }}
                    />
                    <span className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium">
                      Upload
                    </span>
                  </label>
                </Stack>
              </FormControl>

              {field.value ? (
                <div className="mt-3">
                  <Image
                    src={field.value}
                    alt="Config screenshot preview"
                    width={1280}
                    height={720}
                    className="max-h-72 rounded-lg border object-cover"
                  />
                </div>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isFeatured"
          render={({ field }) => (
            <FormItem className="col-span-full flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <FormLabel>Featured</FormLabel>
                <Note>Promote this config in default sorting and featured placements.</Note>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="col-span-full flex justify-between gap-4">
          <Button size="md" variant="secondary" asChild>
            <Link href="/admin/configs">Cancel</Link>
          </Button>

          <Button size="md" isPending={upsertAction.isPending}>
            {config ? "Update Config" : "Create Config"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
