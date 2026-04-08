"use client"

import { useDebouncedState } from "@mantine/hooks"
import Image from "next/image"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useServerAction } from "zsa-react"
import { searchItems } from "~/actions/search"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"
import { VerifiedBadge } from "~/components/web/verified-badge"
import { platformHref, themeHref } from "~/lib/catalogue"
import { buildSearchPageHref, searchPageSortOptions } from "~/lib/search-page"
import type { IconName } from "~/types/icons"
import { cx } from "~/utils/cva"

const THEME_PLACEHOLDERS = ["Tokyo Night", "Catppuccin", "Gruvbox", "Nord", "One Dark", "Solarized"]

const PLATFORM_PLACEHOLDERS = ["VS Code", "Neovim", "JetBrains", "Terminal", "Sublime Text", "Vim"]

type SearchEntity = {
  slug: string
  name: string
  faviconUrl?: string
  isVerified?: boolean
}

type ActiveField = "theme" | "platform" | null

type EntitySearchFormProps = {
  variant?: "hero" | "page"
  initialThemeQuery?: string
  initialPlatformQuery?: string
  initialThemeSelection?: SearchEntity | null
  initialPlatformSelection?: SearchEntity | null
  initialSort?: string
}

const normalize = (value: string) => value.trim()

export const EntitySearchForm = ({
  variant = "hero",
  initialThemeQuery = "",
  initialPlatformQuery = "",
  initialThemeSelection = null,
  initialPlatformSelection = null,
  initialSort = "default",
}: EntitySearchFormProps) => {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const themeFieldRef = useRef<HTMLDivElement>(null)
  const platformFieldRef = useRef<HTMLDivElement>(null)

  const [themeQuery, setThemeQuery] = useState(initialThemeSelection?.name ?? initialThemeQuery)
  const [platformQuery, setPlatformQuery] = useState(
    initialPlatformSelection?.name ?? initialPlatformQuery,
  )
  const [selectedTheme, setSelectedTheme] = useState<SearchEntity | null>(initialThemeSelection)
  const [selectedPlatform, setSelectedPlatform] = useState<SearchEntity | null>(
    initialPlatformSelection,
  )
  const [sortValue, setSortValue] = useState(initialSort)
  const [themePlaceholder, setThemePlaceholder] = useState(THEME_PLACEHOLDERS[0] ?? "")
  const [platformPlaceholder, setPlatformPlaceholder] = useState(PLATFORM_PLACEHOLDERS[0] ?? "")
  const [themeResults, setThemeResults] = useState<SearchEntity[]>([])
  const [platformResults, setPlatformResults] = useState<SearchEntity[]>([])
  const [activeField, setActiveField] = useState<ActiveField>(null)
  const [dropdownAnchor, setDropdownAnchor] = useState<{
    left: number
    top: number
    width: number
  } | null>(null)

  const [debouncedTheme, setDebouncedTheme] = useDebouncedState(
    initialThemeSelection?.name ?? initialThemeQuery,
    350,
  )
  const [debouncedPlatform, setDebouncedPlatform] = useDebouncedState(
    initialPlatformSelection?.name ?? initialPlatformQuery,
    350,
  )

  useEffect(() => {
    setThemeQuery(initialThemeSelection?.name ?? initialThemeQuery)
    setSelectedTheme(initialThemeSelection)
    setDebouncedTheme(initialThemeSelection?.name ?? initialThemeQuery)
  }, [initialThemeQuery, initialThemeSelection, setDebouncedTheme])

  useEffect(() => {
    setPlatformQuery(initialPlatformSelection?.name ?? initialPlatformQuery)
    setSelectedPlatform(initialPlatformSelection)
    setDebouncedPlatform(initialPlatformSelection?.name ?? initialPlatformQuery)
  }, [initialPlatformQuery, initialPlatformSelection, setDebouncedPlatform])

  useEffect(() => {
    setSortValue(initialSort)
  }, [initialSort])

  useEffect(() => {
    let themeIndex = 0
    let platformIndex = 0

    const interval = setInterval(() => {
      themeIndex = (themeIndex + 1) % THEME_PLACEHOLDERS.length
      platformIndex = (platformIndex + 1) % PLATFORM_PLACEHOLDERS.length

      setThemePlaceholder(THEME_PLACEHOLDERS[themeIndex] ?? "")
      setPlatformPlaceholder(PLATFORM_PLACEHOLDERS[platformIndex] ?? "")
    }, 4500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      if (!formRef.current?.contains(target)) {
        setActiveField(null)
      }
    }

    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  useEffect(() => {
    if (!activeField || !formRef.current) {
      setDropdownAnchor(null)
      return
    }

    const targetRef = activeField === "theme" ? themeFieldRef : platformFieldRef

    const updateAnchor = () => {
      const targetEl = targetRef.current
      const formEl = formRef.current

      if (!targetEl || !formEl) return

      const fieldRect = targetEl.getBoundingClientRect()
      const formRect = formEl.getBoundingClientRect()

      setDropdownAnchor({
        left: fieldRect.left - formRect.left,
        top: fieldRect.bottom - formRect.top + 8,
        width: fieldRect.width,
      })
    }

    updateAnchor()

    window.addEventListener("resize", updateAnchor)
    window.addEventListener("scroll", updateAnchor, true)

    return () => {
      window.removeEventListener("resize", updateAnchor)
      window.removeEventListener("scroll", updateAnchor, true)
    }
  }, [activeField, platformQuery, themeQuery])

  const themeSearch = useServerAction(searchItems, {
    onSuccess: ({ data }) => {
      if (data?.telemetry.usedFallback) {
        posthog.capture("search_meili_fallback", {
          source: variant === "hero" ? "hero_search" : "search_page",
          field: "theme",
          queryLength: data.telemetry.queryLength,
          fallbackIndexes: data.telemetry.fallbackIndexes,
          fallbackReasons: data.telemetry.fallbackReasons,
          meiliFailures: data.telemetry.meiliFailures,
        })
      }

      const hits = data?.themes?.hits
      setThemeResults(Array.isArray(hits) ? hits.slice(0, 5) : [])
    },
    onError: () => setThemeResults([]),
  })

  const platformSearch = useServerAction(searchItems, {
    onSuccess: ({ data }) => {
      if (data?.telemetry.usedFallback) {
        posthog.capture("search_meili_fallback", {
          source: variant === "hero" ? "hero_search" : "search_page",
          field: "platform",
          queryLength: data.telemetry.queryLength,
          fallbackIndexes: data.telemetry.fallbackIndexes,
          fallbackReasons: data.telemetry.fallbackReasons,
          meiliFailures: data.telemetry.meiliFailures,
        })
      }

      const hits = data?.platforms?.hits
      setPlatformResults(Array.isArray(hits) ? hits.slice(0, 5) : [])
    },
    onError: () => setPlatformResults([]),
  })

  useEffect(() => {
    const query = normalize(debouncedTheme)

    if (query.length < 2) {
      setThemeResults([])
      return
    }

    themeSearch.execute({ query, indexes: ["themes"] })
  }, [debouncedTheme, themeSearch.execute])

  useEffect(() => {
    const query = normalize(debouncedPlatform)

    if (query.length < 2) {
      setPlatformResults([])
      return
    }

    platformSearch.execute({ query, indexes: ["platforms"] })
  }, [debouncedPlatform, platformSearch.execute])

  const isPending = themeSearch.isPending || platformSearch.isPending

  const showThemeSuggestions = normalize(themeQuery).length >= 2
  const showPlatformSuggestions = normalize(platformQuery).length >= 2
  const showThemeDropdown = activeField === "theme" && showThemeSuggestions
  const showPlatformDropdown = activeField === "platform" && showPlatformSuggestions

  const submitHref = useMemo(
    () =>
      buildSearchPageHref({
        themeQuery,
        platformQuery,
        themeSlug: selectedTheme?.slug,
        platformSlug: selectedPlatform?.slug,
        sort: variant === "page" ? sortValue : undefined,
      }),
    [platformQuery, selectedPlatform?.slug, selectedTheme?.slug, sortValue, themeQuery, variant],
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!normalize(themeQuery) && !normalize(platformQuery)) {
      return
    }

    router.push(submitHref)
    setActiveField(null)
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={cx(
        "relative z-20 w-full",
        variant === "hero" ? "mx-auto max-w-3xl px-6 md:px-2" : "",
      )}
      noValidate
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
          variant === "hero"
            ? "border-white/15"
            : "border-border bg-card shadow-[0_24px_60px_-32px_hsl(var(--foreground)/0.45)]",
        )}
        style={
          variant === "hero"
            ? {
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.48)), radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(255,255,255,0.04), transparent 30%)",
                backdropFilter: "blur(15px)",
                WebkitBackdropFilter: "blur(15px)",
              }
            : undefined
        }
      >
        <div
          className={cx(
            "relative grid",
            variant === "page"
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px_auto]"
              : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
          )}
        >
          <div ref={themeFieldRef} className="relative">
            <SearchField
              label="Theme"
              value={themeQuery}
              placeholder={themePlaceholder}
              isSelected={Boolean(selectedTheme)}
              onFieldFocus={() => setActiveField("theme")}
              onValueChange={value => {
                setThemeQuery(value)
                setDebouncedTheme(value)
                setActiveField("theme")

                if (selectedTheme && value !== selectedTheme.name) {
                  setSelectedTheme(null)
                }
              }}
            />
          </div>

          <div
            ref={platformFieldRef}
            className="relative border-t border-white/10 sm:border-t-0 sm:border-l lg:border-border"
          >
            <SearchField
              label="Platform"
              value={platformQuery}
              placeholder={platformPlaceholder}
              isSelected={Boolean(selectedPlatform)}
              onFieldFocus={() => setActiveField("platform")}
              onValueChange={value => {
                setPlatformQuery(value)
                setDebouncedPlatform(value)
                setActiveField("platform")

                if (selectedPlatform && value !== selectedPlatform.name) {
                  setSelectedPlatform(null)
                }
              }}
            />
          </div>

          {variant === "page" ? (
            <div className="border-t border-border p-2 sm:border-l sm:border-t-0">
              <Select value={sortValue} onValueChange={setSortValue}>
                <SelectTrigger size="sm" className="h-full min-h-11 rounded-lg text-sm">
                  <SelectValue placeholder="Sort results" />
                </SelectTrigger>
                <SelectContent>
                  {searchPageSortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="border-t border-white/10 p-2 sm:border-t-0 sm:border-l lg:border-border">
            <Button
              type="submit"
              variant="fancy"
              size="lg"
              isPending={isPending}
              prefix={<Icon name="lucide/search" className="hidden size-[1.1em] md:block" />}
              className="h-full min-h-11 w-full rounded-lg text-center sm:w-auto"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {(showThemeDropdown || showPlatformDropdown) && dropdownAnchor ? (
        <div
          className="absolute z-50"
          style={{
            left: `${dropdownAnchor.left}px`,
            top: `${dropdownAnchor.top}px`,
            width: `${dropdownAnchor.width}px`,
          }}
        >
          {showThemeDropdown ? (
            <SuggestionDropdown
              iconName="lucide/star"
              isPending={themeSearch.isPending}
              emptyText="No theme matches yet"
              items={themeResults}
              onSelect={item => {
                setSelectedTheme(item)
                setThemeQuery(item.name)
                setDebouncedTheme(item.name)
                setActiveField(null)
              }}
              onNavigate={item => router.push(themeHref(item.slug))}
            />
          ) : (
            <SuggestionDropdown
              iconName="lucide/server"
              isPending={platformSearch.isPending}
              emptyText="No platform matches yet"
              items={platformResults}
              onSelect={item => {
                setSelectedPlatform(item)
                setPlatformQuery(item.name)
                setDebouncedPlatform(item.name)
                setActiveField(null)
              }}
              onNavigate={item => router.push(platformHref(item.slug))}
            />
          )}
        </div>
      ) : null}
    </form>
  )
}

type SearchFieldProps = {
  label: string
  value: string
  placeholder: string
  isSelected: boolean
  className?: string
  onFieldFocus: () => void
  onValueChange: (value: string) => void
}

const SearchField = ({
  label,
  value,
  placeholder,
  isSelected,
  className,
  onFieldFocus,
  onValueChange,
}: SearchFieldProps) => {
  return (
    <label
      className={cx(
        "relative flex min-h-14 flex-col justify-center px-4 py-3 text-start transition-colors",
        "backdrop-blur-2xl focus-within:bg-white/8",
        className,
      )}
    >
      <span className="mb-1 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        <span>{label}</span>
      </span>

      <input
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onFocus={onFieldFocus}
        placeholder={placeholder}
        className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
      />
    </label>
  )
}

type SuggestionDropdownProps<T extends SearchEntity> = {
  iconName: IconName
  items: T[]
  isPending: boolean
  emptyText: string
  onSelect: (item: T) => void
  onNavigate: (item: T) => void
}

const SuggestionDropdown = <T extends SearchEntity>({
  iconName,
  items,
  isPending,
  emptyText,
  onSelect,
  onNavigate,
}: SuggestionDropdownProps<T>) => {
  return (
    <div className="rounded-xl border border-white/12 bg-background/75 p-2 shadow-[0_24px_45px_-28px_hsl(var(--foreground)/0.9)] backdrop-blur-lg">
      {isPending ? (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground/80">
          Searching...
        </p>
      ) : null}

      {!isPending && !items.length ? (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground/80">
          {emptyText}
        </p>
      ) : null}

      {items.length ? (
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {items.map(item => (
            <div key={item.slug} className="flex items-center gap-2 rounded-md hover:bg-accent">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm font-medium text-secondary-foreground hover:text-foreground"
                onClick={() => onSelect(item)}
              >
                <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded bg-background/80">
                  {item.faviconUrl ? (
                    <Image
                      src={item.faviconUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 object-cover"
                    />
                  ) : (
                    <Icon name={iconName} className="size-3.5 opacity-70" />
                  )}
                </span>
                <span className="min-w-0 truncate">{item.name}</span>
                {item.isVerified ? <VerifiedBadge size="xs" /> : null}
              </button>

              <button
                type="button"
                className="mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                onClick={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  onNavigate(item)
                }}
                aria-label={`Open ${item.name}`}
              >
                <Icon name="lucide/arrow-up-right" className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
