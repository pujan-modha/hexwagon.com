"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { parseAsString, useQueryState } from "nuqs"
import type { ComponentProps } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { createAdPackageCheckout, updateAdPackageDraft } from "~/actions/billing"
import { searchPlatformsAction, searchThemesAction } from "~/actions/widget-search"
import { Button } from "~/components/common/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/common/form"
import { Icon } from "~/components/common/icon"
import { Input } from "~/components/common/input"
import { Note } from "~/components/common/note"
import { Stack } from "~/components/common/stack"
import { TextArea } from "~/components/common/textarea"
import { FloatingFooterAdCard } from "~/components/web/ads/ad-floating-footer-client"
import { AdPreviewBanner, AdPreviewCard } from "~/components/web/ads/ad-preview"
import { Price } from "~/components/web/price"
import { Favicon } from "~/components/web/ui/favicon"
import type { AdPackagePricingSettings } from "~/server/web/ads/queries"
import { type AdDetailsSchema, adDetailsSchema } from "~/server/web/shared/schema"
import { cx } from "~/utils/cva"

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg"

type BillingCycle = "Weekly" | "Monthly"

type TargetOption = {
  id: string
  label: string
  logoUrl?: string | null
  isVerified?: boolean
}

type AdDetailsFormProps = ComponentProps<"form"> & {
  draftToken: string
  initialEmail?: string
  isEmailLocked?: boolean
  billingCycle: BillingCycle
  packagePricing: AdPackagePricingSettings
  initialThemeIds: string[]
  initialPlatformIds: string[]
}

export const AdDetailsForm = ({
  className,
  draftToken,
  initialEmail,
  isEmailLocked = false,
  billingCycle,
  packagePricing,
  initialThemeIds,
  initialPlatformIds,
  ...props
}: AdDetailsFormProps) => {
  const [activeDraftToken, setActiveDraftToken] = useState(draftToken)
  const [, setDraftQuery] = useQueryState("draft", parseAsString)
  const [selectedThemes, setSelectedThemes] = useState<TargetOption[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<TargetOption[]>([])
  const [themeQuery, setThemeQuery] = useState("")
  const [platformQuery, setPlatformQuery] = useState("")
  const [themeResults, setThemeResults] = useState<TargetOption[]>([])
  const [platformResults, setPlatformResults] = useState<TargetOption[]>([])
  const [isThemesLoading, setIsThemesLoading] = useState(false)
  const [isPlatformsLoading, setIsPlatformsLoading] = useState(false)

  const themeSearchRequestRef = useRef(0)
  const platformSearchRequestRef = useRef(0)

  useEffect(() => {
    setActiveDraftToken(draftToken)
  }, [draftToken])

  const form = useForm<AdDetailsSchema>({
    resolver: zodResolver(adDetailsSchema),
    defaultValues: {
      email: initialEmail ?? "",
      name: "",
      websiteUrl: "",
      description: "",
      faviconUrl: "",
      faviconFile: undefined,
      buttonLabel: "",
    },
  })

  useEffect(() => {
    if (!initialEmail) {
      return
    }

    form.setValue("email", initialEmail, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [form, initialEmail])

  useEffect(() => {
    setSelectedThemes(current => current.filter(theme => initialThemeIds.includes(theme.id)))
    setSelectedPlatforms(current =>
      current.filter(platform => initialPlatformIds.includes(platform.id)),
    )
  }, [initialPlatformIds, initialThemeIds])

  const selectedCyclePricing =
    billingCycle === "Monthly" ? packagePricing.monthly : packagePricing.weekly
  const targetCount = selectedThemes.length + selectedPlatforms.length

  const priceSummary = useMemo(() => {
    const basePrice = selectedCyclePricing.basePriceCents / 100
    const packagePrice = selectedCyclePricing.discountedPriceCents / 100
    const targetFee = (selectedCyclePricing.targetUnitPriceCents * targetCount) / 100

    return {
      basePrice,
      packagePrice,
      targetFee,
      totalPrice: packagePrice + targetFee,
      targetUnitPrice: selectedCyclePricing.targetUnitPriceCents / 100,
    }
  }, [selectedCyclePricing, targetCount])

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
        isVerified: theme.isVerified,
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
    setSelected: (next: TargetOption[]) => void,
  ) => {
    const isSelected = selected.some(entry => entry.id === item.id)

    if (isSelected) {
      setSelected(selected.filter(entry => entry.id !== item.id))
      return
    }

    setSelected([...selected, item])
  }

  const checkoutAction = useServerAction(createAdPackageCheckout, {
    onSuccess: ({ data }) => {
      window.location.href = data
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = form.handleSubmit(data => {
    checkoutAction.execute({
      draftToken: activeDraftToken,
      themeIds: selectedThemes.map(theme => theme.id),
      platformIds: selectedPlatforms.map(platform => platform.id),
      ...data,
    })
  })

  const switchToMonthlyAction = useServerAction(updateAdPackageDraft, {
    onSuccess: ({ data }) => {
      setActiveDraftToken(data)
      void setDraftQuery(data, { history: "replace", scroll: false })
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const values = form.watch()

  useEffect(() => {
    if (!isEmailLocked || !initialEmail || values.email === initialEmail) {
      return
    }

    form.setValue("email", initialEmail, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [form, initialEmail, isEmailLocked, values.email])

  const getHostnameSafe = (urlStr: string) => {
    if (!urlStr) return null
    try {
      const url = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`
      return new URL(url).hostname
    } catch {
      return null
    }
  }

  const previewAd = useMemo(() => {
    const hostname = getHostnameSafe(values.websiteUrl || "")

    let finalFaviconUrl = values.faviconUrl
    if (!finalFaviconUrl) {
      if (values.faviconFile) {
        try {
          finalFaviconUrl = URL.createObjectURL(values.faviconFile)
        } catch {}
      } else if (hostname) {
        finalFaviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
      } else {
        finalFaviconUrl = "/favicon.svg"
      }
    }

    return {
      type: "All" as const,
      name: values.name || "Ad preview",
      description: values.description || "Your campaign description will appear here.",
      websiteUrl: values.websiteUrl || "https://example.com",
      buttonLabel: values.buttonLabel || "Get started",
      faviconUrl: finalFaviconUrl ?? null,
    }
  }, [values])

  const isPending = checkoutAction.isPending

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className={cx("flex flex-col w-full gap-8", className)}
        noValidate
        {...props}
      >
        <div className="w-full">
          <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3 font-mono">
            Top Banner Preview
          </p>
          <div className="w-full rounded-2xl border border-dashed py-4 shadow-sm overflow-hidden flex justify-center bg-muted/20 relative px-4">
            <AdPreviewBanner ad={previewAd} interactive={false} />
          </div>
        </div>

        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_minmax(0,380px)] items-start">
          <div className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2 border rounded-xl p-5 sm:p-6 bg-card">
              <div className="sm:col-span-2 mb-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Ad Details</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure what your audience will see.
                </p>
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        size="lg"
                        placeholder="you@company.com"
                        readOnly={isEmailLocked}
                        disabled={isEmailLocked}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {isEmailLocked
                        ? "Using your signed-in email for secure campaign ownership."
                        : "Use the same email you will sign in with to track ads in your dashboard."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>Name</FormLabel>
                    <FormControl>
                      <Input type="text" size="lg" placeholder="Product name" {...field} />
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
                    <FormLabel isRequired>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        size="lg"
                        placeholder="https://yourwebsite.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buttonLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Label</FormLabel>
                    <FormControl>
                      <Input type="text" size="lg" placeholder="Get started for free" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <Stack className="w-full justify-between">
                      <FormLabel isRequired>Description</FormLabel>
                      <Note className="text-xs">Max. 160 chars</Note>
                    </Stack>
                    <FormControl>
                      <TextArea
                        size="lg"
                        placeholder="Brief description of your product"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="faviconUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <div className="mb-3">
                      <FormLabel>Icon</FormLabel>
                      <p className="text-[13px] text-muted-foreground leading-tight mt-1">
                        Auto-fetched from website URL. You can override via direct URL or file
                        upload.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {previewAd.faviconUrl && previewAd.faviconUrl !== "/favicon.svg" ? (
                        <Image
                          src={previewAd.faviconUrl}
                          alt="favicon preview"
                          width={104}
                          height={104}
                          unoptimized
                          className="size-16 sm:size-[104px] rounded-xl border bg-muted object-cover flex-shrink-0"
                          onError={e => {
                            ;(e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect width="18" height="18" x="3" y="3" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="9" cy="9" r="2"%3E%3C/circle%3E%3Cpath d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"%3E%3C/path%3E%3C/svg%3E'
                          }}
                        />
                      ) : (
                        <div className="size-16 sm:size-[104px] rounded-xl border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground border-dashed">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-50"
                          >
                            <title>Image placeholder</title>
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 w-full grid gap-3">
                        <FormControl>
                          <Input
                            type="url"
                            size="lg"
                            placeholder="https://yourwebsite.com/icon.png"
                            className="w-full"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormField
                          control={form.control}
                          name="faviconFile"
                          render={({ field: { value: _value, onChange, ...fieldProps } }) => (
                            <FormControl>
                              <Input
                                {...fieldProps}
                                type="file"
                                size="lg"
                                hover
                                accept={IMAGE_ACCEPT}
                                onChange={event => {
                                  const file = event.target.files?.[0]
                                  onChange(file)
                                }}
                              />
                            </FormControl>
                          )}
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <section className="rounded-xl border bg-card p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    Optional Targeted Visibility
                  </h3>
                  <span className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground w-fit font-normal">
                    +${priceSummary.targetUnitPrice.toFixed(2)}/target/
                    {billingCycle === "Monthly" ? "month" : "week"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add theme or platform targets to boost delivery on matching pages. Skip this step
                  if you want standard sitewide rotation.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <TargetSearchSelect
                  title="Themes"
                  query={themeQuery}
                  onQueryChange={handleThemeSearch}
                  options={themeResults}
                  selectedItems={selectedThemes}
                  isLoading={isThemesLoading}
                  onToggle={item => toggleTarget(item, selectedThemes, setSelectedThemes)}
                  emptyMessage="No themes found."
                />

                <TargetSearchSelect
                  title="Platforms"
                  query={platformQuery}
                  onQueryChange={handlePlatformSearch}
                  options={platformResults}
                  selectedItems={selectedPlatforms}
                  isLoading={isPlatformsLoading}
                  onToggle={item => toggleTarget(item, selectedPlatforms, setSelectedPlatforms)}
                  emptyMessage="No platforms found."
                />
              </div>

              {targetCount === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No targets selected. Your campaign will run with standard visibility across the
                  site.
                </p>
              )}
            </section>
          </div>

          <div className="space-y-4 lg:sticky lg:top-[120px] h-fit">
            <div className="w-full">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Card Preview
              </h3>
            </div>
            <div className="rounded-2xl border border-dashed bg-card p-4 shadow-sm overflow-hidden flex flex-col items-center">
              <div className="w-full flex justify-center relative">
                <AdPreviewCard
                  ad={previewAd}
                  interactive={false}
                  className="w-full max-w-[328px]"
                />
              </div>
            </div>

            <div className="w-full pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Floating Preview
              </h3>
            </div>
            <div className="rounded-2xl border border-dashed bg-card p-4 shadow-sm overflow-hidden flex flex-col items-center">
              <FloatingFooterAdCard ad={previewAd} isPreview interactive={false} />
            </div>

            <div className="rounded-2xl border bg-card shadow-sm flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-3">
                  Total summary
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                  <Price
                    price={priceSummary.totalPrice}
                    fullPrice={priceSummary.basePrice + priceSummary.targetFee}
                    interval={billingCycle === "Monthly" ? "month" : "week"}
                    priceClassName="text-4xl font-extrabold tracking-tight"
                  />
                </div>

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex justify-between items-center">
                    <span>Base package ({billingCycle.toLowerCase()})</span>
                    <span className="font-medium text-foreground">
                      ${priceSummary.packagePrice.toFixed(2)}
                    </span>
                  </li>
                  {targetCount > 0 && (
                    <li className="flex justify-between items-center">
                      <span>
                        Targeting ({targetCount} target
                        {targetCount === 1 ? "" : "s"})
                      </span>
                      <span className="font-medium text-foreground">
                        ${priceSummary.targetFee.toFixed(2)}
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {billingCycle === "Weekly" && (
                <div className="mx-5 mb-5 rounded-xl border bg-muted/40 p-4 flex flex-col gap-3">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold">
                      Save 25% with Monthly!!
                    </strong>
                    <br />
                    Monthly plan includes a flat 25% discount on both the base package and
                    per-target pricing.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full shadow-sm font-medium"
                    isPending={switchToMonthlyAction.isPending}
                    onClick={() => {
                      switchToMonthlyAction.execute({
                        draftToken: activeDraftToken,
                        billingCycle: "Monthly",
                        themeIds: selectedThemes.map(theme => theme.id),
                        platformIds: selectedPlatforms.map(platform => platform.id),
                      })
                    }}
                  >
                    Switch to Monthly
                  </Button>
                </div>
              )}

              <div className="p-5 border-t bg-muted/20">
                <Button
                  type="submit"
                  size="lg"
                  variant="fancy"
                  className="w-full font-semibold"
                  isPending={isPending}
                >
                  Continue to checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
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
  const unselectedOptions = options.filter(opt => !selectedIds.includes(opt.id))

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
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

      <div className="max-h-64 overflow-y-auto flex flex-col">
        {selectedItems.map(option => (
          <button
            type="button"
            key={`selected-${option.id}`}
            onClick={() => onToggle(option)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors border-b last:border-b-0 bg-primary/5 hover:bg-destructive/10 group"
          >
            <span className="flex min-w-0 items-center gap-3">
              {option.logoUrl ? (
                <Favicon
                  src={option.logoUrl}
                  title={option.label}
                  plain
                  className="size-6 rounded-md bg-transparent"
                />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                  {option.label.slice(0, 1)}
                </span>
              )}
              <span className="truncate text-sm font-medium text-foreground flex items-center gap-1.5">
                {option.label}
                {option.isVerified && (
                  <Icon name="lucide/badge-check" className="size-4 text-blue-500 shrink-0" />
                )}
              </span>
            </span>

            <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-destructive/10 group-hover:text-destructive transition-colors">
              <Icon name="lucide/check" className="size-3.5 group-hover:hidden" />
              <Icon name="lucide/x" className="size-3.5 hidden group-hover:block" />
            </span>
          </button>
        ))}

        {normalizedQuery.length < 2 && selectedItems.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}

        {normalizedQuery.length >= 2 && isLoading && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Searching...</p>
        )}

        {normalizedQuery.length >= 2 && !isLoading && unselectedOptions.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        )}

        {unselectedOptions.map(option => (
          <button
            type="button"
            key={option.id}
            onClick={() => onToggle(option)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors border-b last:border-b-0 hover:bg-muted/30 group"
          >
            <span className="flex min-w-0 items-center gap-3">
              {option.logoUrl ? (
                <Favicon
                  src={option.logoUrl}
                  title={option.label}
                  plain
                  className="size-6 rounded-md bg-transparent"
                />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                  {option.label.slice(0, 1)}
                </span>
              )}
              <span className="truncate text-sm font-medium text-foreground flex items-center gap-1.5">
                {option.label}
                {option.isVerified && (
                  <Icon name="lucide/badge-check" className="size-4 text-blue-500 shrink-0" />
                )}
              </span>
            </span>

            <span className="grid size-5 place-items-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Icon name="lucide/plus" className="size-3.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
