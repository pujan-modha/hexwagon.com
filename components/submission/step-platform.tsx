"use client"

import Link from "next/link"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useCallback, useState } from "react"
import { searchPlatformsAction } from "~/actions/widget-search"
import { Button } from "~/components/common/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/common/command"
import { Dialog, DialogContent, DialogTrigger } from "~/components/common/dialog"
import { Icon } from "~/components/common/icon"
import { Label } from "~/components/common/label"
import { Favicon } from "~/components/web/ui/favicon"
import { VerifiedBadge } from "~/components/web/verified-badge"
import { useSubmissionStore } from "~/stores/submission-store"

type StepPlatformProps = {
  onNext: () => void
  onBack: () => void
}

const StepPlatform = ({ onNext, onBack }: StepPlatformProps) => {
  const { platformName, setPlatform } = useSubmissionStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [platforms, setPlatforms] = useState<
    Array<{
      id: string
      name: string
      faviconUrl?: string | null
      isVerified?: boolean
    }>
  >([])

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q)
    const normalizedQuery = q.trim()

    if (normalizedQuery.length < 2) {
      setPlatforms([])
      return
    }

    setIsLoading(true)
    try {
      const [results, error] = await searchPlatformsAction({
        query: normalizedQuery,
      })

      if (error) {
        setPlatforms([])
        return
      }

      setPlatforms(results ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelect = (id: string, name: string) => {
    setPlatform(id, name)
    setOpen(false)
    onNext()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="platform-search">Search for a platform</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="justify-start text-left font-normal"
              onClick={() => setOpen(true)}
            >
              {platformName ?? "Select a platform..."}
            </Button>
          </DialogTrigger>

          <DialogContent className="p-0">
            <DialogPrimitive.Title className="sr-only">Search for a platform</DialogPrimitive.Title>
            <Command>
              <CommandInput
                placeholder="Search platforms..."
                value={search}
                onValueChange={handleSearch}
              />
              <CommandList>
                <CommandEmpty>{isLoading ? "Searching..." : "No platform found."}</CommandEmpty>
                {platforms.map(platform => (
                  <CommandItem
                    key={platform.id}
                    value={platform.name}
                    onSelect={() => handleSelect(platform.id, platform.name)}
                  >
                    {platform.faviconUrl ? (
                      <Favicon
                        src={platform.faviconUrl}
                        title={platform.name}
                        plain
                        className="size-5"
                      />
                    ) : (
                      <span className="flex size-5 items-center justify-center rounded-sm border bg-muted/40">
                        <Icon name="lucide/globe" className="size-3.5 text-muted-foreground" />
                      </span>
                    )}

                    <span className="truncate">{platform.name}</span>

                    {platform.isVerified ? <VerifiedBadge size="xs" className="mr-auto" /> : null}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Can&apos;t find your platform?{" "}
        <Link href="/suggest?type=Platform" className="underline hover:text-foreground">
          Suggest a new platform
        </Link>
      </p>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!platformName}>
          Next
        </Button>
      </div>
    </div>
  )
}

export { StepPlatform }
