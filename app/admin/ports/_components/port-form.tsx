"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { getRandomString, isValidUrl, slugify } from "@primoui/utils"
import { type Port, PortStatus } from "@prisma/client"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { use, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
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
import type { findPlatformList } from "~/server/admin/platforms/queries"
import { upsertPort } from "~/server/admin/ports/actions"
import type { findPortBySlug } from "~/server/admin/ports/queries"
import { portSchema } from "~/server/admin/ports/schema"
import type { findThemeList } from "~/server/admin/themes/queries"
import { cx } from "~/utils/cva"
import { PortActions } from "./port-actions"
import { PortPublishActions } from "./port-publish-actions"

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg"

type PortFormProps = ComponentProps<"form"> & {
  port?: Awaited<ReturnType<typeof findPortBySlug>>
  platformsPromise: ReturnType<typeof findPlatformList>
  themesPromise: ReturnType<typeof findThemeList>
}

const PortStatusChange = ({ port }: { port: Port }) => {
  return (
    <>
      <ExternalLink href={`/${port.slug}`} className="font-semibold underline inline-block">
        {port.name ?? port.slug}
      </ExternalLink>{" "}
      is now {port.status.toLowerCase()}.
    </>
  )
}

export function PortForm({
  children,
  className,
  title,
  port,
  platformsPromise,
  themesPromise,
  ...props
}: PortFormProps) {
  const router = useRouter()
  const platforms = use(platformsPromise)
  const themes = use(themesPromise)

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isStatusPending, setIsStatusPending] = useState(false)
  const [originalStatus, setOriginalStatus] = useState(port?.status ?? PortStatus.Draft)

  const form = useForm({
    resolver: zodResolver(portSchema),
    defaultValues: {
      name: port?.name ?? "",
      slug: port?.slug ?? "",
      description: port?.description ?? "",
      content: port?.content ?? "",
      repositoryUrl: port?.repositoryUrl ?? "",
      faviconUrl: port?.faviconUrl ?? "",
      screenshotUrl: port?.screenshotUrl ?? "",
      isOfficial: port?.isOfficial ?? false,
      isFeatured: port?.isFeatured ?? false,
      submitterName: port?.submitterName ?? "",
      submitterEmail: port?.submitterEmail ?? "",
      submitterNote: port?.submitterNote ?? "",
      publishedAt: port?.publishedAt ?? null,
      status: port?.status ?? PortStatus.Draft,
      rejectionReason: port?.rejectionReason ?? "",
      themeId: port?.themeId ?? "",
      platformId: port?.platformId ?? "",
      license: port?.license ?? "",
    },
  })

  useComputedField({
    form,
    sourceField: "name",
    computedField: "slug",
    callback: slugify,
    enabled: !port,
  })

  const [name, slug, repositoryUrl, content] = form.watch([
    "name",
    "slug",
    "repositoryUrl",
    "content",
  ])

  const upsertAction = useServerAction(upsertPort, {
    onSuccess: ({ data }) => {
      if (data.status !== originalStatus) {
        toast.success(<PortStatusChange port={data} />)
        setOriginalStatus(data.status)
      } else {
        toast.success(`Port successfully ${port ? "updated" : "created"}`)
      }

      if (!port || data.slug !== port?.slug) {
        router.push(`/admin/ports/${data.slug}`)
      }
    },
    onError: ({ err }) => toast.error(err.message),
    onFinish: () => setIsStatusPending(false),
  })

  const faviconAction = useServerAction(generateFavicon, {
    onSuccess: ({ data }) => {
      form.setValue("faviconUrl", data)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const uploadImageAction = useServerAction(uploadImageToS3, {
    onSuccess: ({ data }) => {
      toast.success("Image uploaded successfully. Please save the port to update.")
      form.setValue("faviconUrl", data, { shouldDirty: true })
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const uploadScreenshotAction = useServerAction(uploadImageToS3, {
    onSuccess: ({ data }) => {
      toast.success("Screenshot uploaded successfully. Please save the port to update.")
      form.setValue("screenshotUrl", data, { shouldDirty: true })
    },
    onError: ({ err }) => toast.error(err.message),
  })

  useEffect(() => {
    const currentFaviconUrl = form.getValues("faviconUrl")?.trim()
    if (currentFaviconUrl) return
    if (!isValidUrl(repositoryUrl)) return
    if (faviconAction.isPending || uploadImageAction.isPending) return

    faviconAction.execute({
      url: repositoryUrl,
      path: `ports/${slug || getRandomString(12)}`,
    })
  }, [form, repositoryUrl, slug, faviconAction.isPending, uploadImageAction.isPending])

  const handleSubmit = form.handleSubmit((data, event) => {
    const submitter = (event?.nativeEvent as SubmitEvent)?.submitter
    const isStatusChange = submitter?.getAttribute("name") !== "submit"

    if (isStatusChange) setIsStatusPending(true)

    upsertAction.execute({ id: port?.id, ...data })
  })

  const handleStatusSubmit = (status: PortStatus, publishedAt: Date | null) => {
    form.setValue("status", status)
    form.setValue("publishedAt", publishedAt)
    handleSubmit()
  }

  return (
    <Form {...form}>
      <Stack className="justify-between">
        <H3 className="flex-1 truncate">{title}</H3>

        <Stack size="sm" className="-my-0.5">
          {port && <PortActions port={port} />}
        </Stack>

        {port && (
          <Note className="w-full">
            View:{" "}
            <ExternalLink
              href={`/themes/${port.theme.slug}/${port.platform.slug}/${port.slug}`}
              className="text-primary underline"
            >
              {siteConfig.url}/themes/{port.theme.slug}/{port.platform.slug}/{port.slug}
            </ExternalLink>
          </Note>
        )}
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
          name="themeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Theme</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map(theme => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="platformId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Input {...field} list="port-license-suggestions" placeholder="MIT" />
              </FormControl>
              <datalist id="port-license-suggestions">
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
          name="repositoryUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Port URL</FormLabel>
              <FormControl>
                <Input type="url" {...field} />
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
          name="content"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Content</FormLabel>
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
            name="isOfficial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Official</FormLabel>
                <FormControl>
                  <Switch onCheckedChange={field.onChange} checked={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

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
                  disabled={!isValidUrl(repositoryUrl) || faviconAction.isPending}
                  onClick={() => {
                    faviconAction.execute({
                      url: repositoryUrl,
                      path: `ports/${slug || getRandomString(12)}`,
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
                      path: `ports/${slug || getRandomString(12)}/favicon-upload`,
                    })

                    event.currentTarget.value = ""
                  }}
                />

                <Note className="text-xs">Upload PNG, JPG, WebP, GIF, AVIF, or SVG. Max 8MB.</Note>
              </Stack>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="screenshotUrl"
          render={({ field }) => (
            <FormItem className="items-stretch">
              <Stack className="justify-between">
                <FormLabel className="flex-1">Screenshot URL</FormLabel>
              </Stack>

              <Stack size="sm">
                {field.value && (
                  <Image
                    src={field.value}
                    alt="Screenshot"
                    width={128}
                    height={32}
                    className="h-8 max-w-32 border box-content rounded-md object-contain"
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

                    uploadScreenshotAction.execute({
                      file,
                      path: `ports/${slug || getRandomString(12)}/screenshot-upload`,
                    })

                    event.currentTarget.value = ""
                  }}
                />

                <Note className="text-xs">Upload PNG, JPG, WebP, GIF, AVIF, or SVG. Max 8MB.</Note>
              </Stack>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="submitterName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Submitter Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="submitterEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Submitter Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rejectionReason"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Rejection Reason</FormLabel>
              <FormControl>
                <TextArea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-4 col-span-full">
          <Button size="md" variant="secondary" asChild>
            <Link href="/admin/ports">Cancel</Link>
          </Button>

          <PortPublishActions
            isPending={!isStatusPending && upsertAction.isPending}
            isStatusPending={isStatusPending}
            onStatusSubmit={handleStatusSubmit}
          />
        </div>
      </form>
    </Form>
  )
}
