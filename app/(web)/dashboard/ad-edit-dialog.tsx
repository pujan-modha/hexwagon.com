"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { cancelOwnAdSubscription, resubmitAdForReview } from "~/actions/ad-review"
import { searchPlatformsAction, searchThemesAction } from "~/actions/widget-search"
import { Badge } from "~/components/common/badge"
import { Button } from "~/components/common/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/common/dialog"
import { Icon } from "~/components/common/icon"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import { Note } from "~/components/common/note"
import { TextArea } from "~/components/common/textarea"
import { Favicon } from "~/components/web/ui/favicon"
import type { UserDashboardAd } from "~/server/web/ads/queries"

type TargetOption = {
  id: string
  label: string
  logoUrl?: string | null
}

type FormValues = {
  name: string
  description: string
  websiteUrl: string
  buttonLabel: string
  faviconUrl: string
}

type AdEditDialogProps = {
  ad: UserDashboardAd
}

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg"

const toTargetOption = (item: {
  id: string
  name: string
  faviconUrl?: string | null
}) => ({
  id: item.id,
  label: item.name,
  logoUrl: item.faviconUrl,
})

const TargetPicker = ({
  title,
  query,
  onQueryChange,
  options,
  selectedItems,
  onToggle,
  isLoading,
  emptyMessage,
}: {
  title: string
  query: string
  onQueryChange: (value: string) => void
  options: TargetOption[]
  selectedItems: TargetOption[]
  onToggle: (item: TargetOption) => void
  isLoading: boolean
  emptyMessage: string
}) => {
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{title}</Label>
        <span className="text-xs text-muted-foreground">{selectedItems.length} selected</span>
      </div>

      <Input
        value={query}
        onChange={event => onQueryChange(event.target.value)}
        placeholder={`Search ${title.toLowerCase()}...`}
      />

      <div className="max-h-44 space-y-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Searching...</p>
        ) : options.length ? (
          options.map(item => {
            const isSelected = selectedItems.some(selected => selected.id === item.id)

            return (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                onClick={() => onToggle(item)}
              >
                <Favicon src={item.logoUrl ?? null} title={item.label} className="size-5" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {isSelected ? (
                  <Badge size="sm" variant="info">
                    Selected
                  </Badge>
                ) : null}
              </button>
            )
          })
        ) : query.trim().length >= 2 ? (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Type at least 2 characters to search.</p>
        )}
      </div>

      {selectedItems.length ? (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedItems.map(item => (
            <button
              key={item.id}
              type="button"
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
              onClick={() => onToggle(item)}
            >
              <span className="truncate max-w-[18ch]">{item.label}</span>
              <Icon name="lucide/x" className="size-3.5" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const AdEditDialog = ({ ad }: AdEditDialogProps) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [faviconFile, setFaviconFile] = useState<File>()
  const [themeQuery, setThemeQuery] = useState("")
  const [platformQuery, setPlatformQuery] = useState("")
  const [themeResults, setThemeResults] = useState<TargetOption[]>([])
  const [platformResults, setPlatformResults] = useState<TargetOption[]>([])
  const [isThemesLoading, setIsThemesLoading] = useState(false)
  const [isPlatformsLoading, setIsPlatformsLoading] = useState(false)

  const themeSearchRequestRef = useRef(0)
  const platformSearchRequestRef = useRef(0)

  const initialValues = useMemo<FormValues>(
    () => ({
      name: ad.name,
      description: ad.description ?? "",
      websiteUrl: ad.websiteUrl,
      buttonLabel: ad.buttonLabel ?? "",
      faviconUrl: ad.faviconUrl ?? "",
    }),
    [ad.buttonLabel, ad.description, ad.faviconUrl, ad.name, ad.websiteUrl],
  )

  const initialThemeTargets = useMemo(() => ad.targetThemes.map(toTargetOption), [ad.targetThemes])
  const initialPlatformTargets = useMemo(
    () => ad.targetPlatforms.map(toTargetOption),
    [ad.targetPlatforms],
  )

  const [values, setValues] = useState<FormValues>(initialValues)
  const [selectedThemes, setSelectedThemes] = useState<TargetOption[]>(initialThemeTargets)
  const [selectedPlatforms, setSelectedPlatforms] = useState<TargetOption[]>(initialPlatformTargets)
  const maxTargetCount =
    ad.targetingTargetCount > 0
      ? ad.targetingTargetCount
      : initialThemeTargets.length + initialPlatformTargets.length

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setValues(initialValues)
    setSelectedThemes(initialThemeTargets)
    setSelectedPlatforms(initialPlatformTargets)
    setThemeQuery("")
    setPlatformQuery("")
    setThemeResults([])
    setPlatformResults([])
    setFaviconFile(undefined)
  }, [isOpen, initialValues, initialPlatformTargets, initialThemeTargets])

  const { execute, isPending } = useServerAction(resubmitAdForReview, {
    onSuccess: () => {
      toast.success("Ad updated and submitted for review.")
      setIsOpen(false)
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const cancelSubscriptionAction = useServerAction(cancelOwnAdSubscription, {
    onSuccess: () => {
      toast.success("Subscription cancelled.")
      setIsOpen(false)
      router.refresh()
    },
    onError: ({ err }) => {
      toast.error(err.message)
    },
  })

  const canCancelSubscription =
    ad.billingProvider === "PayPal" &&
    Boolean(ad.billingSubscriptionId) &&
    ad.status !== "Cancelled"

  const getHostnameSafe = (urlStr: string) => {
    if (!urlStr) return null

    try {
      const url = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`
      return new URL(url).hostname
    } catch {
      return null
    }
  }

  const previewImageUrl = useMemo(() => {
    if (values.faviconUrl.trim().length > 0) {
      return values.faviconUrl
    }

    if (faviconFile) {
      try {
        return URL.createObjectURL(faviconFile)
      } catch {
        return null
      }
    }

    const hostname = getHostnameSafe(values.websiteUrl)

    if (hostname) {
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
    }

    return null
  }, [faviconFile, values.faviconUrl, values.websiteUrl])

  const onThemeSearch = async (value: string) => {
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
      (results ?? []).map(item => ({
        id: item.id,
        label: item.name,
        logoUrl: item.faviconUrl,
      })),
    )
    setIsThemesLoading(false)
  }

  const onPlatformSearch = async (value: string) => {
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
      (results ?? []).map(item => ({
        id: item.id,
        label: item.name,
        logoUrl: item.faviconUrl,
      })),
    )
    setIsPlatformsLoading(false)
  }

  const toggleTarget = (
    item: TargetOption,
    selected: TargetOption[],
    setSelected: (items: TargetOption[]) => void,
  ) => {
    const exists = selected.some(entry => entry.id === item.id)

    if (exists) {
      setSelected(selected.filter(entry => entry.id !== item.id))
      return
    }

    const nextTargetCount = selectedThemes.length + selectedPlatforms.length + 1

    if (nextTargetCount > maxTargetCount) {
      toast.error(
        `You can select up to ${maxTargetCount} target${maxTargetCount === 1 ? "" : "s"} for this campaign.`,
      )
      return
    }

    setSelected([...selected, item])
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          {ad.adminNote ? "Edit and resubmit" : "Edit ad"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit ad details</DialogTitle>
          <DialogDescription>Update your creative and resubmit for admin review.</DialogDescription>
        </DialogHeader>

        {ad.adminNote ? (
          <Note className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            Requested changes: {ad.adminNote}
          </Note>
        ) : null}

        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault()
            execute({
              adId: ad.id,
              name: values.name,
              description: values.description,
              websiteUrl: values.websiteUrl,
              buttonLabel: values.buttonLabel,
              faviconUrl: values.faviconUrl,
              faviconFile,
              themeIds: selectedThemes.map(item => item.id),
              platformIds: selectedPlatforms.map(item => item.id),
            })
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={`ad-name-${ad.id}`}>Company name</Label>
            <Input
              id={`ad-name-${ad.id}`}
              value={values.name}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`ad-description-${ad.id}`}>Description</Label>
            <TextArea
              id={`ad-description-${ad.id}`}
              value={values.description}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Short description"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`ad-url-${ad.id}`}>Destination URL</Label>
            <Input
              id={`ad-url-${ad.id}`}
              type="url"
              value={values.websiteUrl}
              onChange={event =>
                setValues(current => ({
                  ...current,
                  websiteUrl: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`ad-button-${ad.id}`}>Button label (optional)</Label>
              <Input
                id={`ad-button-${ad.id}`}
                value={values.buttonLabel}
                onChange={event =>
                  setValues(current => ({
                    ...current,
                    buttonLabel: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Ad image</Label>
            <p className="text-xs text-muted-foreground">
              Use image URL or upload from disk. If both are empty we auto-fetch from website URL.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start rounded-md border p-3">
              {previewImageUrl ? (
                <Image
                  src={previewImageUrl}
                  alt="Ad image preview"
                  width={104}
                  height={104}
                  unoptimized
                  className="size-16 sm:size-[104px] rounded-xl border bg-muted object-cover flex-shrink-0"
                  onError={event => {
                    ;(event.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='104' height='104' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E"
                  }}
                />
              ) : (
                <div className="size-16 sm:size-[104px] rounded-xl border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground border-dashed">
                  <span className="text-xs">No image</span>
                </div>
              )}

              <div className="grid flex-1 gap-3 w-full">
                <Input
                  id={`ad-favicon-${ad.id}`}
                  type="url"
                  value={values.faviconUrl}
                  onChange={event =>
                    setValues(current => ({
                      ...current,
                      faviconUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/logo.svg"
                />

                <Input
                  id={`ad-file-${ad.id}`}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  onChange={event => setFaviconFile(event.target.files?.[0])}
                />

                <p className="text-xs text-muted-foreground">
                  Uploaded file takes priority over image URL.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <TargetPicker
              title="Themes"
              query={themeQuery}
              onQueryChange={onThemeSearch}
              options={themeResults}
              selectedItems={selectedThemes}
              onToggle={item => toggleTarget(item, selectedThemes, setSelectedThemes)}
              isLoading={isThemesLoading}
              emptyMessage="No themes found."
            />

            <TargetPicker
              title="Platforms"
              query={platformQuery}
              onQueryChange={onPlatformSearch}
              options={platformResults}
              selectedItems={selectedPlatforms}
              onToggle={item => toggleTarget(item, selectedPlatforms, setSelectedPlatforms)}
              isLoading={isPlatformsLoading}
              emptyMessage="No platforms found."
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Targeting limit: {selectedThemes.length + selectedPlatforms.length}/{maxTargetCount}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div>
              {canCancelSubscription ? (
                <Button
                  type="button"
                  variant="destructive"
                  isPending={cancelSubscriptionAction.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Cancel subscription for ${ad.name}? This will stop the campaign immediately and cannot be undone from dashboard.`,
                      )
                    ) {
                      return
                    }

                    cancelSubscriptionAction.execute({ adId: ad.id })
                  }}
                >
                  Cancel subscription
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button type="submit" isPending={isPending}>
                Submit for review
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
