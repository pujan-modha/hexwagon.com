"use client"

import { type HotkeyItem, useDebouncedState, useHotkeys } from "@mantine/hooks"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { posthog } from "posthog-js"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { inferServerActionReturnData } from "zsa"
import { useServerAction } from "zsa-react"
import { indexAllData } from "~/actions/misc"
import { searchItems } from "~/actions/search"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "~/components/common/command"
import { Icon } from "~/components/common/icon"
import { Kbd } from "~/components/common/kbd"
import { useSearch } from "~/contexts/search-context"
import { useSession } from "~/lib/auth-client"

type SearchResultsProps<T> = {
  name: string
  items: T[] | undefined
  onItemSelect: (url: string) => void
  getHref: (item: T) => string
  renderItemDisplay: (item: T) => ReactNode
}

const SearchResults = <T extends { slug: string }>({
  name,
  items,
  onItemSelect,
  getHref,
  renderItemDisplay,
}: SearchResultsProps<T>) => {
  if (!items?.length) return null

  return (
    <CommandGroup heading={name}>
      {items.map(item => (
        <CommandItem
          key={item.slug}
          value={`${name.toLowerCase()}:${item.slug}`}
          onSelect={() => onItemSelect(getHref(item))}
        >
          {renderItemDisplay(item)}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

type CommandSection = {
  name: string
  items: {
    label: string
    path: string
    shortcut?: boolean
  }[]
}

const formatPortsCount = (count?: number) => {
  if (count === undefined) {
    return null
  }

  return `${count.toLocaleString()} port${count === 1 ? "" : "s"}`
}

export const Search = () => {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearch()
  const [results, setResults] = useState<inferServerActionReturnData<typeof searchItems>>()
  const [query, setQuery] = useDebouncedState("", 500)
  const listRef = useRef<HTMLDivElement>(null)
  const normalizedQuery = query.trim()
  const ports = results?.ports?.hits
  const themes = results?.themes?.hits
  const platforms = results?.platforms?.hits
  const isAdmin = session?.user.role === "admin"
  const isAdminPath = pathname.startsWith("/admin")
  const hasQuery = normalizedQuery.length > 0

  const actions = [
    {
      action: indexAllData,
      label: "Index All Data",
      successMessage: "Data indexed",
    },
  ] as const

  const adminActions = actions.map(({ label, action, successMessage }) => ({
    label,
    execute: useServerAction(action, {
      onSuccess: () => toast.success(successMessage),
      onError: ({ err }) => toast.error(err.message),
    }).execute,
  }))

  const clearSearch = () => {
    setTimeout(() => {
      setResults(undefined)
      setQuery("")
    }, 250)
  }

  const handleOpenChange = (open: boolean) => {
    open ? search.open() : search.close()
    if (!open) clearSearch()
  }

  const navigateTo = (path: string) => {
    router.push(path)
    handleOpenChange(false)
  }

  const commandSections: CommandSection[] = []
  const hotkeys: HotkeyItem[] = [["mod+K", () => search.open()]]

  // Admin command sections & hotkeys
  if (isAdmin) {
    commandSections.push({
      name: "Create",
      items: [
        {
          label: "New Port",
          path: "/admin/ports/new",
          shortcut: true,
        },
        {
          label: "New Theme",
          path: "/admin/themes/new",
          shortcut: true,
        },
        {
          label: "New Platform",
          path: "/admin/platforms/new",
          shortcut: true,
        },
      ],
    })

    for (const [i, { path, shortcut }] of commandSections[0].items.entries()) {
      shortcut && hotkeys.push([`mod+${i + 1}`, () => navigateTo(path)])
    }

    // User command sections & hotkeys
  } else {
    commandSections.push({
      name: "Quick Links",
      items: [
        { label: "Ports", path: "/" },
        { label: "Themes", path: "/themes" },
        { label: "Platforms", path: "/platforms" },
      ],
    })
  }

  useHotkeys(hotkeys, [], true)

  const { execute, isPending } = useServerAction(searchItems, {
    onSuccess: ({ data }) => {
      setResults(data)

      if (data?.telemetry.usedFallback) {
        posthog.capture("search_meili_fallback", {
          source: "command_search",
          queryLength: data.telemetry.queryLength,
          fallbackIndexes: data.telemetry.fallbackIndexes,
          fallbackReasons: data.telemetry.fallbackReasons,
          meiliFailures: data.telemetry.meiliFailures,
        })
      }

      const q = normalizedQuery.toLowerCase()

      if (q.length > 1) {
        posthog.capture("search", { query: q })
      }
    },

    onError: ({ err }) => {
      console.error(err)
      setResults(undefined)
    },
  })

  useEffect(() => {
    const performSearch = async () => {
      if (normalizedQuery.length > 0) {
        execute({ query: normalizedQuery })
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        setResults(undefined)
      }
    }

    performSearch()
  }, [normalizedQuery, execute])

  return (
    <CommandDialog open={search.isOpen} onOpenChange={handleOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Type to search..."
        onValueChange={setQuery}
        className="pr-10"
        prefix={isPending && <Icon name="lucide/loader" className="animate-spin" />}
        suffix={<Kbd meta>K</Kbd>}
      />

      {hasQuery && !isPending && (
        <CommandEmpty>No results found. Please try a different query.</CommandEmpty>
      )}

      <CommandList ref={listRef}>
        {!hasQuery &&
          commandSections.map(({ name, items }) => (
            <CommandGroup key={name} heading={name}>
              {items.map(({ path, label, shortcut }, i) => (
                <CommandItem key={path} onSelect={() => navigateTo(path)}>
                  {label}
                  {shortcut && <CommandShortcut meta>{i + 1}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {!hasQuery && isAdmin && (
          <CommandGroup heading="Admin">
            {adminActions.map(({ label, execute }) => (
              <CommandItem key={label} onSelect={() => execute()}>
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <SearchResults
          name="Ports"
          items={ports}
          onItemSelect={navigateTo}
          getHref={({ id, slug, name, themeSlug, platformSlug }) => {
            if (isAdminPath) {
              return `/admin/ports/${slug}`
            }

            if (id && themeSlug && platformSlug) {
              return `/themes/${themeSlug}/${platformSlug}/${id}`
            }

            const q = encodeURIComponent(name || slug)
            return `/themes?q=${q}`
          }}
          renderItemDisplay={({ name, theme, platform, themeSlug, platformSlug }) => {
            const themeLabel = theme ?? themeSlug ?? "Theme"
            const platformLabel = platform ?? platformSlug ?? "Platform"

            return (
              <>
                <span className="flex-1 truncate">{name}</span>
                <span className="truncate text-xs text-muted-foreground/70">
                  {themeLabel} / {platformLabel}
                </span>
              </>
            )
          }}
        />

        <SearchResults
          name="Themes"
          items={themes}
          onItemSelect={navigateTo}
          getHref={({ slug }) => `${isAdminPath ? "/admin" : ""}/themes/${slug}`}
          renderItemDisplay={({ name, faviconUrl, portsCount }) => (
            <>
              {faviconUrl && <Image src={faviconUrl} alt="" width={16} height={16} />}
              <span className="flex-1 truncate">{name}</span>
              {formatPortsCount(portsCount) ? (
                <span className="text-xs text-muted-foreground/70">{formatPortsCount(portsCount)}</span>
              ) : null}
            </>
          )}
        />

        <SearchResults
          name="Platforms"
          items={platforms}
          onItemSelect={navigateTo}
          getHref={({ slug }) => (isAdminPath ? `/admin/platforms/${slug}` : `/platforms/${slug}`)}
          renderItemDisplay={({ name, portsCount }) => (
            <>
              <span className="flex-1 truncate">{name}</span>
              {formatPortsCount(portsCount) ? (
                <span className="text-xs text-muted-foreground/70">{formatPortsCount(portsCount)}</span>
              ) : null}
            </>
          )}
        />
      </CommandList>

      {!!results && (
        <div className="px-3 py-2 text-[10px] text-muted-foreground/50 not-first:border-t">
          Found{" "}
          {(results.ports?.estimatedTotalHits ?? 0) +
            (results.themes?.estimatedTotalHits ?? 0) +
            (results.platforms?.estimatedTotalHits ?? 0)}{" "}
          results in{" "}
          {Math.max(
            results.ports?.processingTimeMs ?? 0,
            results.themes?.processingTimeMs ?? 0,
            results.platforms?.processingTimeMs ?? 0,
          )}
          ms
        </div>
      )}
    </CommandDialog>
  )
}
