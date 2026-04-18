"use client"

import type { ComponentProps } from "react"
import { useCallback, useMemo, useState } from "react"
import { Button } from "~/components/common/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/common/command"
import { Icon } from "~/components/common/icon"
import { Label } from "~/components/common/label"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/common/popover"
import { Favicon } from "~/components/web/ui/favicon"
import { VerifiedBadge } from "~/components/web/verified-badge"

type Entity = {
  id: string
  name: string
  faviconUrl?: string | null
  isVerified?: boolean
}

type EntityMultiSelectProps = {
  addLabel: string
  emptyLabel: string
  inputLabel: string
  placeholder: string
  searchEmptyText: string
  fallbackIcon: ComponentProps<typeof Icon>["name"]
  selected: Entity[]
  onChange: (entries: Entity[]) => void
  onSearch: (query: string) => Promise<Entity[]>
}

const EntityMultiSelect = ({
  addLabel,
  emptyLabel,
  inputLabel,
  placeholder,
  searchEmptyText,
  fallbackIcon,
  selected,
  onChange,
  onSearch,
}: EntityMultiSelectProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<Entity[]>([])

  const selectedIds = useMemo(() => new Set(selected.map(entry => entry.id)), [selected])
  const visibleResults = useMemo(() => {
    const selectedResults = selected.filter(entry =>
      results.every(result => result.id !== entry.id),
    )
    return [...selectedResults, ...results]
  }, [results, selected])

  const handleSearch = useCallback(
    async (query: string) => {
      setSearch(query)
      const normalizedQuery = query.trim()

      if (normalizedQuery.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        setResults(await onSearch(normalizedQuery))
      } finally {
        setIsLoading(false)
      }
    },
    [onSearch],
  )

  const handleToggle = (entry: Entity) =>
    onChange(
      selectedIds.has(entry.id)
        ? selected.filter(candidate => candidate.id !== entry.id)
        : [...selected, entry],
    )

  const handleRemove = (id: string) => {
    onChange(selected.filter(entry => entry.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{inputLabel}</Label>

        <Popover
          open={open}
          onOpenChange={nextOpen => {
            setOpen(nextOpen)

            if (!nextOpen) {
              setSearch("")
              setResults([])
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className="justify-start text-left font-normal"
              type="button"
              onClick={() => setOpen(true)}
            >
              {selected.length ? addLabel : emptyLabel}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="p-0" align="start">
            <Command>
              <CommandInput placeholder={placeholder} value={search} onValueChange={handleSearch} />

              <CommandList className="min-w-72 w-(--radix-popper-anchor-width)">
                <CommandEmpty>{isLoading ? "Searching..." : searchEmptyText}</CommandEmpty>

                <CommandGroup>
                  {visibleResults.map(entry => {
                    const isSelected = selectedIds.has(entry.id)

                    return (
                      <CommandItem
                        key={entry.id}
                        value={entry.name}
                        onSelect={() => handleToggle(entry)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="pointer-events-none"
                        />

                        {entry.faviconUrl ? (
                          <Favicon
                            src={entry.faviconUrl}
                            title={entry.name}
                            plain
                            className="size-5"
                          />
                        ) : (
                          <span className="flex size-5 items-center justify-center rounded-sm border bg-muted/40">
                            <Icon name={fallbackIcon} className="size-3.5 text-muted-foreground" />
                          </span>
                        )}

                        <span className="truncate">{entry.name}</span>

                        {entry.isVerified ? <VerifiedBadge size="xs" className="mr-auto" /> : null}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-h-14 flex-wrap gap-2 rounded-lg border border-dashed p-3">
        {selected.length ? (
          selected.map(entry => (
            <span
              key={entry.id}
              className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-sm"
            >
              <span className="truncate">{entry.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(entry.id)}
                className="text-muted-foreground transition hover:text-foreground"
                aria-label={`Remove ${entry.name}`}
              >
                <Icon name="lucide/x" className="size-3.5" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No selections yet.</span>
        )}
      </div>
    </div>
  )
}

export { EntityMultiSelect }
