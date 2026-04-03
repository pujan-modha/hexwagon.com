"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { getRandomString } from "@primoui/utils"
import { addDays, differenceInCalendarDays, parseISO } from "date-fns"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { useServerAction } from "zsa-react"
import { uploadImageToS3 } from "~/actions/media"
import { searchPlatformsAction, searchThemesAction } from "~/actions/widget-search"
import { Badge } from "~/components/common/badge"
import { Button } from "~/components/common/button"
import { Card, CardDescription, CardHeader } from "~/components/common/card"
import { Checkbox } from "~/components/common/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog"
import { H4 } from "~/components/common/heading"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"
import { TextArea } from "~/components/common/textarea"
import { type AdPreviewAd, AdPreviewBanner, AdPreviewCard } from "~/components/web/ads/ad-preview"
import { Favicon } from "~/components/web/ui/favicon"
import { createAd, updateAd } from "~/server/admin/ads/actions"
import type { AdAdminMany } from "~/server/admin/ads/payloads"
import { adStatus } from "~/utils/ads"

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg"

type AdFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ad?: AdAdminMany
}

type TargetOption = {
  id: string
  label: string
  logoUrl?: string | null
}

const formSchema = z
  .object({
    spot: z.enum(["Banner", "Listing", "Sidebar", "Footer", "All"]),
    email: z.string().email("Must be a valid email address.").max(255),
    name: z.string().min(1, "Ad name is required.").max(255),
    description: z.string().max(500).optional().or(z.literal("")),
    destinationUrl: z.string().url("Must be a valid URL.").max(2048),
    faviconUrl: z.string().url("Must be a valid image URL.").max(2048).optional().or(z.literal("")),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date."),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date."),
    priceUsd: z
      .string()
      .min(1, "Required.")
      .refine(value => !Number.isNaN(Number(value)) && Number(value) >= 0, {
        message: "Must be zero or more.",
      }),
    status: z.enum([adStatus.Pending, adStatus.Approved, adStatus.Rejected, adStatus.Cancelled]),
    markAsPaid: z.boolean(),
    autoPrice: z.boolean(),
    buttonLabel: z.string().max(80).optional().or(z.literal("")),
    themeIds: z.array(z.string()).max(50),
    platformIds: z.array(z.string()).max(50),
    useCustomCode: z.boolean(),
    customHtml: z.string().optional().or(z.literal("")),
    customCss: z.string().optional().or(z.literal("")),
    customJs: z.string().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .refine(value => new Date(value.endsAt) >= new Date(value.startsAt), {
    message: "End date must be on or after start date.",
    path: ["endsAt"],
  })

type FormValues = z.infer<typeof formSchema>

const toDateInput = (date: Date) => date.toISOString().split("T")[0] ?? ""

const centsToUsd = (cents?: number | null) => ((cents ?? 0) / 100).toFixed(2)

const usdToCents = (usd: string) => Math.round(Number(usd) * 100)

const AdFormDialog = ({ open, onOpenChange, ad }: AdFormDialogProps) => {
  const isEdit = ad !== undefined
  const isAdminManagedAd =
    !ad?.stripeCheckoutSessionId && !ad?.stripePaymentIntentId && !ad?.subscriptionId

  const defaultThemeTargets: TargetOption[] = (ad?.targetThemes ?? []).map(theme => ({
    id: theme.id,
    label: theme.name,
    logoUrl: theme.faviconUrl,
  }))

  const defaultPlatformTargets: TargetOption[] = (ad?.targetPlatforms ?? []).map(platform => ({
    id: platform.id,
    label: platform.name,
    logoUrl: platform.faviconUrl,
  }))

  const defaultSpot = (ad?.type ?? "All") as FormValues["spot"]

  const defaultValues: FormValues = isEdit
    ? {
        spot: ad.type as FormValues["spot"],
        email: ad.email,
        name: ad.name,
        description: ad.description ?? "",
        destinationUrl: ad.websiteUrl,
        faviconUrl: ad.faviconUrl ?? "",
        startsAt: toDateInput(ad.startsAt),
        endsAt: toDateInput(ad.endsAt),
        priceUsd: centsToUsd(ad.priceCents),
        status: ad.status as FormValues["status"],
        markAsPaid: ad.paidAt !== null,
        autoPrice: false,
        buttonLabel: ad.buttonLabel ?? "",
        themeIds: defaultThemeTargets.map(theme => theme.id),
        platformIds: defaultPlatformTargets.map(platform => platform.id),
        useCustomCode: Boolean(ad.customHtml || ad.customCss || ad.customJs),
        customHtml: ad.customHtml ?? "",
        customCss: ad.customCss ?? "",
        customJs: ad.customJs ?? "",
        isActive: ad.status === adStatus.Approved,
      }
    : {
        spot: defaultSpot,
        email: "",
        name: "",
        description: "",
        destinationUrl: "",
        faviconUrl: "",
        startsAt: toDateInput(new Date()),
        endsAt: toDateInput(addDays(new Date(), 7)),
        priceUsd: "0.00",
        status: adStatus.Approved,
        markAsPaid: true,
        autoPrice: true,
        buttonLabel: "",
        themeIds: [],
        platformIds: [],
        useCustomCode: false,
        customHtml: "",
        customCss: "",
        customJs: "",
        isActive: true,
      }

  const [themeQuery, setThemeQuery] = useState("")
  const [platformQuery, setPlatformQuery] = useState("")
  const [themeResults, setThemeResults] = useState<TargetOption[]>([])
  const [platformResults, setPlatformResults] = useState<TargetOption[]>([])
  const [selectedThemes, setSelectedThemes] = useState<TargetOption[]>(defaultThemeTargets)
  const [selectedPlatforms, setSelectedPlatforms] = useState<TargetOption[]>(defaultPlatformTargets)
  const [isThemesLoading, setIsThemesLoading] = useState(false)
  const [isPlatformsLoading, setIsPlatformsLoading] = useState(false)

  const themeSearchRequestRef = useRef(0)
  const platformSearchRequestRef = useRef(0)

  const { register, handleSubmit, setValue, control, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
    setSelectedThemes(defaultThemeTargets)
    setSelectedPlatforms(defaultPlatformTargets)
    setThemeQuery("")
    setPlatformQuery("")
    setThemeResults([])
    setPlatformResults([])
  }, [ad?.id, open, reset])

  useEffect(() => {
    setValue(
      "themeIds",
      selectedThemes.map(theme => theme.id),
      {
        shouldValidate: true,
      },
    )
  }, [selectedThemes, setValue])

  useEffect(() => {
    setValue(
      "platformIds",
      selectedPlatforms.map(platform => platform.id),
      {
        shouldValidate: true,
      },
    )
  }, [selectedPlatforms, setValue])

  const handleThemeSearch = async (value: string) => {
    setThemeQuery(value)
    const query = value.trim()

    if (query.length < 2) {
      setThemeResults([])
      setIsThemesLoading(false)
      return
    }

    const requestId = ++themeSearchRequestRef.current
    setIsThemesLoading(true)

    const [results, error] = await searchThemesAction({ query })

    if (requestId !== themeSearchRequestRef.current) {
      return
    }

    if (error) {
      setThemeResults([])
      setIsThemesLoading(false)
      return
    }

    setThemeResults(
      (results ?? []).map(theme => ({
        id: theme.id,
        label: theme.name,
        logoUrl: theme.faviconUrl,
      })),
    )
    setIsThemesLoading(false)
  }

  const handlePlatformSearch = async (value: string) => {
    setPlatformQuery(value)
    const query = value.trim()

    if (query.length < 2) {
      setPlatformResults([])
      setIsPlatformsLoading(false)
      return
    }

    const requestId = ++platformSearchRequestRef.current
    setIsPlatformsLoading(true)

    const [results, error] = await searchPlatformsAction({ query })

    if (requestId !== platformSearchRequestRef.current) {
      return
    }

    if (error) {
      setPlatformResults([])
      setIsPlatformsLoading(false)
      return
    }

    setPlatformResults(
      (results ?? []).map(platform => ({
        id: platform.id,
        label: platform.name,
        logoUrl: platform.faviconUrl,
      })),
    )
    setIsPlatformsLoading(false)
  }

  const toggleTarget = (
    item: TargetOption,
    selected: TargetOption[],
    setSelected: (items: TargetOption[]) => void,
  ) => {
    const isSelected = selected.some(entry => entry.id === item.id)

    if (isSelected) {
      setSelected(selected.filter(entry => entry.id !== item.id))
      return
    }

    setSelected([...selected, item])
  }

  const watchedValues = useWatch({ control }) as Partial<FormValues>
  const watchedSpot = watchedValues.spot ?? defaultValues.spot
  const watchedStart = watchedValues.startsAt ?? defaultValues.startsAt
  const watchedEnd = watchedValues.endsAt ?? defaultValues.endsAt

  const days = useMemo(() => {
    const startDate = parseISO(watchedStart)
    const endDate = parseISO(watchedEnd)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
    if (endDate < startDate) return null

    return differenceInCalendarDays(endDate, startDate) + 1
  }, [watchedStart, watchedEnd])

  const { execute: createAction, isPending: createPending } = useServerAction(createAd, {
    onSuccess: () => {
      toast.success("Ad created.")
      onOpenChange(false)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const { execute: updateAction, isPending: updatePending } = useServerAction(updateAd, {
    onSuccess: () => {
      toast.success("Ad updated.")
      onOpenChange(false)
    },
    onError: ({ err }) => toast.error(err.message),
  })

  const isPending = createPending || updatePending

  const { execute: uploadImageAction, isPending: isUploadingImage } = useServerAction(
    uploadImageToS3,
    {
      onSuccess: ({ data }) => {
        toast.success("Image uploaded successfully.")
        setValue("faviconUrl", data, { shouldValidate: true })
      },
      onError: ({ err }) => toast.error(err.message),
    },
  )

  const previewAd: AdPreviewAd = {
    type: watchedSpot,
    websiteUrl: watchedValues.destinationUrl || "https://example.com",
    name: watchedValues.name || "Ad preview",
    description: watchedValues.description || "Campaign description will appear here.",
    buttonLabel: watchedValues.buttonLabel || null,
    faviconUrl: watchedValues.faviconUrl ?? defaultValues.faviconUrl ?? null,
  }

  const PreviewComponent = watchedSpot === "Banner" ? AdPreviewBanner : AdPreviewCard
  const previewPlacement =
    watchedSpot === "All"
      ? "All placements"
      : watchedSpot === "Banner"
        ? "Banner placement"
        : watchedSpot === "Sidebar"
          ? "Sidebar placement"
          : watchedSpot === "Footer"
            ? "Footer placement"
            : "Listing placement"

  const onSubmit = (values: FormValues) => {
    const nextStatus = values.isActive ? adStatus.Approved : adStatus.Cancelled

    const payload = {
      spot: isEdit ? values.spot : "All",
      email: values.email,
      name: values.name,
      description: values.description !== "" ? values.description : undefined,
      destinationUrl: values.destinationUrl,
      faviconUrl: values.faviconUrl !== "" ? values.faviconUrl : undefined,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      priceCents: isEdit ? usdToCents(values.priceUsd) : 0,
      status: isEdit && !isAdminManagedAd ? values.status : nextStatus,
      markAsPaid: true,
      buttonLabel: values.buttonLabel !== "" ? values.buttonLabel : undefined,
      themeIds: values.themeIds,
      platformIds: values.platformIds,
      customHtml: values.useCustomCode && values.customHtml !== "" ? values.customHtml : undefined,
      customCss: values.useCustomCode && values.customCss !== "" ? values.customCss : undefined,
      customJs: values.useCustomCode && values.customJs !== "" ? values.customJs : undefined,
    }

    if (isEdit) {
      updateAction({ adId: ad.id, ...payload })
      return
    }

    createAction(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl lg:max-h-[92vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Ad" : "Create Ad"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the ad details and save changes."
              : "Create a direct ad deal or house ad."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <form
            id="ad-form"
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-5 sm:grid-cols-2 lg:pr-1"
          >
            <input type="hidden" {...register("spot")} />
            <input type="hidden" {...register("priceUsd")} />
            <input type="hidden" {...register("markAsPaid")} />
            <input type="hidden" {...register("autoPrice")} />

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Rotation
              </p>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={watchedValues.isActive ?? defaultValues.isActive}
                  onCheckedChange={checked =>
                    setValue("isActive", checked === true, {
                      shouldValidate: true,
                    })
                  }
                />
                <Label htmlFor="isActive">Active in ad rotation</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Turn this off to keep the ad saved but excluded from public placements.
              </p>

              {isEdit && !isAdminManagedAd && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watchedValues.status ?? defaultValues.status}
                    onValueChange={value =>
                      setValue("status", value as FormValues["status"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(adStatus).map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Campaign
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Start Date</Label>
                  <Input id="startsAt" type="date" {...register("startsAt")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endsAt">End Date</Label>
                  <Input id="endsAt" type="date" {...register("endsAt")} />
                </div>
              </div>
              {days !== null && (
                <p className="text-xs text-muted-foreground">
                  {days} day{days === 1 ? "" : "s"} campaign
                </p>
              )}
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Targeting
              </p>
              <p className="text-xs text-muted-foreground">
                Optional: boost this ad on matching theme or platform pages.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <TargetSearchSelect
                  title="Themes"
                  query={themeQuery}
                  onQueryChange={handleThemeSearch}
                  options={themeResults}
                  selectedItems={selectedThemes}
                  onToggle={item => toggleTarget(item, selectedThemes, setSelectedThemes)}
                  isLoading={isThemesLoading}
                  emptyMessage="No themes found."
                />

                <TargetSearchSelect
                  title="Platforms"
                  query={platformQuery}
                  onQueryChange={handlePlatformSearch}
                  options={platformResults}
                  selectedItems={selectedPlatforms}
                  onToggle={item => toggleTarget(item, selectedPlatforms, setSelectedPlatforms)}
                  isLoading={isPlatformsLoading}
                  emptyMessage="No platforms found."
                />
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Advertiser
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Ad name" {...register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...register("email")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  placeholder="Short description for the ad"
                  {...register("description")}
                />
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Creative
              </p>
              <div className="space-y-2">
                <Label htmlFor="destinationUrl">Destination URL</Label>
                <Input
                  id="destinationUrl"
                  type="url"
                  placeholder="https://example.com"
                  {...register("destinationUrl")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Image URL</Label>
                <Input
                  id="faviconUrl"
                  type="url"
                  placeholder="https://example.com/image.png"
                  {...register("faviconUrl")}
                />
                <Input
                  type="file"
                  hover
                  accept={IMAGE_ACCEPT}
                  onChange={event => {
                    const file = event.target.files?.[0]
                    if (!file) return

                    uploadImageAction({
                      file,
                      path: `ads/${getRandomString(12)}/favicon-upload`,
                    })

                    event.currentTarget.value = ""
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the website favicon. If none exists, the ad will render without
                  an image.
                </p>
                {isUploadingImage && (
                  <p className="text-xs text-muted-foreground">Uploading image...</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="buttonLabel">Button Label</Label>
                <Input id="buttonLabel" placeholder="Learn more" {...register("buttonLabel")} />
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useCustomCode"
                  checked={watchedValues.useCustomCode}
                  onCheckedChange={checked => setValue("useCustomCode", checked === true)}
                />
                <Label htmlFor="useCustomCode">Use custom HTML/CSS/JS</Label>
              </div>

              {watchedValues.useCustomCode && (
                <div className="grid gap-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="customHtml">HTML</Label>
                    <TextArea
                      id="customHtml"
                      className="min-h-28 font-mono text-xs"
                      {...register("customHtml")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customCss">CSS</Label>
                    <TextArea
                      id="customCss"
                      className="min-h-24 font-mono text-xs"
                      {...register("customCss")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customJs">JavaScript</Label>
                    <TextArea
                      id="customJs"
                      className="min-h-24 font-mono text-xs"
                      {...register("customJs")}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>

          <Card className="self-start overflow-hidden border-border/70 bg-muted/25 shadow-sm lg:sticky lg:top-4">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <H4 as="h2">Preview</H4>
                  <CardDescription>
                    Rendered with the same public ad layout used on the site.
                  </CardDescription>
                </div>

                <Badge variant="outline">{previewPlacement}</Badge>
              </div>

              <div
                className={
                  watchedSpot === "Sidebar" || watchedSpot === "Footer" ? "max-w-sm" : "w-full"
                }
              >
                <PreviewComponent ad={previewAd} interactive={false} />
              </div>

              <div className="grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium tabular-nums">
                    {days ? `${days} day${days === 1 ? "" : "s"}` : "Select dates"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="font-medium tabular-nums">
                    {(watchedValues.isActive ?? defaultValues.isActive) ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="ad-form" isPending={isPending}>
            {isEdit ? "Save changes" : "Create ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type TargetSearchSelectProps = {
  title: string
  query: string
  onQueryChange: (value: string) => void
  options: TargetOption[]
  selectedItems: TargetOption[]
  onToggle: (item: TargetOption) => void
  isLoading: boolean
  emptyMessage: string
}

const TargetSearchSelect = ({
  title,
  query,
  onQueryChange,
  options,
  selectedItems,
  onToggle,
  isLoading,
  emptyMessage,
}: TargetSearchSelectProps) => {
  const normalizedQuery = query.trim()
  const selectedIds = selectedItems.map(item => item.id)
  const unselectedOptions = options.filter(option => !selectedIds.includes(option.id))

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <div className="border-b bg-muted/20 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {title}
        </p>

        <Input
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="h-9"
        />
      </div>

      <div className="max-h-56 overflow-y-auto flex flex-col">
        {selectedItems.map(option => (
          <button
            type="button"
            key={`selected-${option.id}`}
            onClick={() => onToggle(option)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left border-b bg-primary/5 hover:bg-destructive/10"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Favicon src={option.logoUrl ?? null} title={option.label} plain className="size-5" />
              <span className="truncate text-sm font-medium text-foreground">{option.label}</span>
            </span>

            <span className="text-xs text-muted-foreground">Remove</span>
          </button>
        ))}

        {normalizedQuery.length < 2 && selectedItems.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}

        {normalizedQuery.length >= 2 && isLoading && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Searching...</p>
        )}

        {normalizedQuery.length >= 2 && !isLoading && unselectedOptions.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">{emptyMessage}</p>
        )}

        {normalizedQuery.length >= 2 &&
          !isLoading &&
          unselectedOptions.map(option => (
            <button
              type="button"
              key={`option-${option.id}`}
              onClick={() => onToggle(option)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left border-b hover:bg-accent/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Favicon
                  src={option.logoUrl ?? null}
                  title={option.label}
                  plain
                  className="size-5"
                />
                <span className="truncate text-sm text-foreground">{option.label}</span>
              </span>

              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          ))}
      </div>
    </div>
  )
}

export { AdFormDialog }
