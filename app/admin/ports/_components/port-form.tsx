"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { getRandomString, isValidUrl, slugify } from "@primoui/utils"
import { type Port, PortStatus } from "@prisma/client"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { use, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { generateFavicon, generateScreenshot } from "~/actions/media"
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
import { upsertPort } from "~/server/admin/ports/actions"
import type { findPortBySlug } from "~/server/admin/ports/queries"
import { portSchema } from "~/server/admin/ports/schema"
import type { findPlatformList } from "~/server/admin/platforms/queries"
import type { findThemeList } from "~/server/admin/themes/queries"
import { PortActions } from "./port-actions"
import { PortGenerateDescription } from "./port-generate-description"
import { PortPublishActions } from "./port-publish-actions"
import { cx } from "~/utils/cva"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"

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
      is now {port.status.toLowerCase()}.{" "}
      {port.status === PortStatus.Scheduled && (
        <>
          Will be published on {port.publishedAt ? port.publishedAt.toLocaleString() : "soon"}.
        </>
      )}
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
      websiteUrl: port?.websiteUrl ?? "",
      repositoryUrl: port?.repositoryUrl ?? "",
      installUrl: port?.installUrl ?? "",
      faviconUrl: port?.faviconUrl ?? "",
      screenshotUrl: port?.screenshotUrl ?? "",
      isOfficial: port?.isOfficial ?? false,
      isFeatured: port?.isFeatured ?? false,
      isSelfHosted: port?.isSelfHosted ?? false,
      submitterName: port?.submitterName ?? "",
      submitterEmail: port?.submitterEmail ?? "",
      submitterNote: port?.submitterNote ?? "",
      discountCode: port?.discountCode ?? "",
      discountAmount: port?.discountAmount ?? "",
      publishedAt: port?.publishedAt ?? null,
      status: port?.status ?? PortStatus.Draft,
      rejectionReason: port?.rejectionReason ?? "",
      themeId: port?.themeId ?? "",
      platformId: port?.platformId ?? "",
      license: port?.license ?? "",
      notifySubmitter: true,
    },
  })

  useComputedField({
    form,
    sourceField: "name",
    computedField: "slug",
    callback: slugify,
    enabled: !port,
  })

  const [name, slug, websiteUrl, content] = form.watch([
    "name",
    "slug",
    "websiteUrl",
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
      toast.success("Favicon successfully generated. Please save the port to update.")
      form.setValue("faviconUrl", data)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const screenshotAction = useServerAction(generateScreenshot, {
    onSuccess: ({ data }) => {
      toast.success("Screenshot successfully generated. Please save the port to update.")
      form.setValue("screenshotUrl", data)
    },
    onError: ({ err }) => toast.error(err.message),
  })

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
          <PortGenerateDescription />

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
            {port.status === PortStatus.Scheduled && port.publishedAt && (
              <>
                <br />
                Scheduled to be published on{" "}
                <strong className="text-foreground">{port.publishedAt.toLocaleString()}</strong>
              </>
            )}
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
                <Input type="url" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="installUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Install URL</FormLabel>
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

        <div className="grid gap-4 @2xl:grid-cols-2">
          <FormField
            control={form.control}
            name="isSelfHosted"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Self-hosted</FormLabel>
                <FormControl>
                  <Switch onCheckedChange={field.onChange} checked={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notifySubmitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notify submitter</FormLabel>
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
                  prefix={<Icon name="lucide/refresh-cw" className={cx(faviconAction.isPending && "animate-spin")} />}
                  className="-my-1"
                  disabled={!isValidUrl(websiteUrl) || faviconAction.isPending}
                  onClick={() => {
                    faviconAction.execute({
                      url: websiteUrl,
                      path: `ports/${slug || getRandomString(12)}`,
                    })
                  }}
                >
                  {field.value ? "Regenerate" : "Generate"}
                </Button>
              </Stack>

              <Stack size="sm">
                {field.value && (
                  <img
                    src={field.value}
                    alt="Favicon"
                    className="size-8 border box-content rounded-md object-contain"
                  />
                )}

                <FormControl>
                  <Input type="url" className="flex-1" {...field} />
                </FormControl>
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

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  prefix={<Icon name="lucide/refresh-cw" className={cx(screenshotAction.isPending && "animate-spin")} />}
                  className="-my-1"
                  disabled={!isValidUrl(websiteUrl) || screenshotAction.isPending}
                  onClick={() => {
                    screenshotAction.execute({
                      url: websiteUrl,
                      path: `ports/${slug || getRandomString(12)}`,
                    })
                  }}
                >
                  {field.value ? "Regenerate" : "Generate"}
                </Button>
              </Stack>

              <Stack size="sm">
                {field.value && (
                  <img
                    src={field.value}
                    alt="Screenshot"
                    className="h-8 max-w-32 border box-content rounded-md object-contain"
                  />
                )}

                <FormControl>
                  <Input type="url" className="flex-1" {...field} />
                </FormControl>
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

        <div className="grid gap-4 @2xl:grid-cols-2">
          <FormField
            control={form.control}
            name="discountCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Code</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Amount</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
