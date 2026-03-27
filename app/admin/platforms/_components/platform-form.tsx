"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { getRandomString, isValidUrl, slugify } from "@primoui/utils"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import { use, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { generateFavicon } from "~/actions/media"
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
import { upsertPlatform } from "~/server/admin/platforms/actions"
import type { findPlatformBySlug } from "~/server/admin/platforms/queries"
import { platformSchema } from "~/server/admin/platforms/schema"
import { PlatformActions } from "./platform-actions"
import { PlatformGenerateDescription } from "./platform-generate-description"
import { cx } from "~/utils/cva"

type PlatformFormProps = ComponentProps<"form"> & {
  platform?: Awaited<ReturnType<typeof findPlatformBySlug>>
}

export function PlatformForm({
  children,
  className,
  title,
  platform,
  ...props
}: PlatformFormProps) {
  const router = useRouter()
  const [isPreviewing, setIsPreviewing] = useState(false)

  const form = useForm({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      name: platform?.name ?? "",
      slug: platform?.slug ?? "",
      description: platform?.description ?? "",
      websiteUrl: platform?.websiteUrl ?? "",
      faviconUrl: platform?.faviconUrl ?? "",
      installInstructions: platform?.installInstructions ?? "",
      themeCreationDocs: platform?.themeCreationDocs ?? "",
      isFeatured: platform?.isFeatured ?? false,
      order: platform?.order ?? 0,
      license: platform?.license ?? "",
    },
  })

  useComputedField({
    form,
    sourceField: "name",
    computedField: "slug",
    callback: slugify,
    enabled: !platform,
  })

  const [slug, websiteUrl] = form.watch(["slug", "websiteUrl"])

  const upsertAction = useServerAction(upsertPlatform, {
    onSuccess: ({ data }) => {
      toast.success(`Platform successfully ${platform ? "updated" : "created"}`)

      if (!platform || data.slug !== platform.slug) {
        router.push(`/admin/platforms/${data.slug}`)
      }
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const faviconAction = useServerAction(generateFavicon, {
    onSuccess: ({ data }) => {
      toast.success("Favicon successfully generated. Please save the platform to update.")
      form.setValue("faviconUrl", data)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const handleSubmit = form.handleSubmit(data => {
    upsertAction.execute({ id: platform?.id, ...data })
  })

  return (
    <Form {...form}>
      <Stack className="justify-between">
        <H3 className="flex-1 truncate">{title}</H3>

        <Stack size="sm" className="-my-0.5">
          <PlatformGenerateDescription />

          {platform && <PlatformActions platform={platform} className="ml-auto" />}
        </Stack>

        {platform && (
          <Note className="w-full">
            View:{" "}
            <ExternalLink href={`/platforms/${platform.slug}`} className="text-primary underline">
              {siteConfig.url}/platforms/{platform.slug}
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
          name="license"
          render={({ field }) => (
            <FormItem>
              <FormLabel>License</FormLabel>
              <FormControl>
                <Input {...field} list="platform-license-suggestions" placeholder="MIT" />
              </FormControl>
              <datalist id="platform-license-suggestions">
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
          name="installInstructions"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Install Instructions</FormLabel>
              <FormControl>
                <TextArea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="themeCreationDocs"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Theme Creation Docs</FormLabel>
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
                    prefix={<Icon name="lucide/refresh-cw" className={cx(faviconAction.isPending && "animate-spin")} />}
                    className="-my-1"
                    disabled={!isValidUrl(websiteUrl) || faviconAction.isPending}
                    onClick={() => {
                      faviconAction.execute({
                        url: websiteUrl,
                        path: `platforms/${slug || getRandomString(12)}`,
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
        </div>

        <div className="flex justify-between gap-4 col-span-full">
          <Button size="md" variant="secondary" asChild>
            <Link href="/admin/platforms">Cancel</Link>
          </Button>

          <Button size="md" isPending={upsertAction.isPending}>
            {platform ? "Update platform" : "Create platform"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
