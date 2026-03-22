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
import { siteConfig } from "~/config/site"
import { useComputedField } from "~/hooks/use-computed-field"
import { upsertTheme } from "~/server/admin/themes/actions"
import type { findThemeBySlug } from "~/server/admin/themes/queries"
import { themeSchema } from "~/server/admin/themes/schema"
import type { findLicenseList } from "~/server/admin/licenses/queries"
import { ThemeActions } from "./theme-actions"
import { ThemeGenerateDescription } from "./theme-generate-description"
import { cx } from "~/utils/cva"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"

type ThemeFormProps = ComponentProps<"form"> & {
  theme?: Awaited<ReturnType<typeof findThemeBySlug>>
  licensesPromise: ReturnType<typeof findLicenseList>
}

export function ThemeForm({
  children,
  className,
  title,
  theme,
  licensesPromise,
  ...props
}: ThemeFormProps) {
  const router = useRouter()
  const licenses = use(licensesPromise)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const form = useForm({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      name: theme?.name ?? "",
      slug: theme?.slug ?? "",
      websiteUrl: theme?.websiteUrl ?? "",
      repositoryUrl: theme?.repositoryUrl ?? "",
      description: theme?.description ?? "",
      faviconUrl: theme?.faviconUrl ?? "",
      author: theme?.author ?? "",
      authorUrl: theme?.authorUrl ?? "",
      guidelines: theme?.guidelines ?? "",
      isFeatured: theme?.isFeatured ?? false,
      discountCode: theme?.discountCode ?? "",
      discountAmount: theme?.discountAmount ?? "",
      licenseId: theme?.licenseId ?? "",
    },
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
      toast.success("Favicon successfully generated. Please save the theme to update.")
      form.setValue("faviconUrl", data)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const handleSubmit = form.handleSubmit(data => {
    upsertAction.execute({ id: theme?.id, ...data })
  })

  return (
    <Form {...form}>
      <Stack className="justify-between">
        <H3 className="flex-1 truncate">{title}</H3>

        <Stack size="sm" className="-my-0.5">
          <ThemeGenerateDescription />

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
          name="licenseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>License</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a license" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenses.map(license => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.name}
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
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="authorUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author URL</FormLabel>
              <FormControl>
                <Input {...field} />
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
                        path: `themes/${slug || getRandomString(12)}`,
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
            <Link href="/admin/themes">Cancel</Link>
          </Button>

          <Button size="md" isPending={upsertAction.isPending}>
            {theme ? "Update theme" : "Create theme"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
