"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Icon } from "~/components/common/icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"

type SortOption = {
  value: string
  label: string
}

type CatalogueSearchControlsProps = {
  query: string
  sort: string
  placeholder: string
  sortOptions: SortOption[]
}

export const CatalogueSearchControls = ({
  query,
  sort,
  placeholder,
  sortOptions,
}: CatalogueSearchControlsProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const normalizedSort = useMemo(() => {
    if (sortOptions.some(option => option.value === sort)) {
      return sort
    }

    return "default"
  }, [sort, sortOptions])

  const [queryValue, setQueryValue] = useState(query)
  const [sortValue, setSortValue] = useState(normalizedSort)

  useEffect(() => {
    setQueryValue(query)
  }, [query])

  useEffect(() => {
    setSortValue(normalizedSort)
  }, [normalizedSort])

  const apply = (nextQuery: string, nextSort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const trimmedQuery = nextQuery.trim()

    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery)
    } else {
      params.delete("q")
    }

    if (nextSort && nextSort !== "default") {
      params.set("sort", nextSort)
    } else {
      params.delete("sort")
    }

    params.delete("page")

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <form
      className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]"
      onSubmit={event => {
        event.preventDefault()
        apply(queryValue, sortValue)
      }}
    >
      <label className="relative flex h-10 items-center rounded-lg border border-border bg-background px-3">
        <Icon
          name="lucide/search"
          className="pointer-events-none size-4 text-muted-foreground/80"
        />
        <span className="sr-only">Search</span>
        <input
          value={queryValue}
          onChange={event => setQueryValue(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent pl-2 text-sm text-foreground outline-none placeholder:text-sm placeholder:text-muted-foreground/75"
          aria-label="Search"
        />
      </label>

      <Select
        value={sortValue}
        onValueChange={value => {
          setSortValue(value)
          apply(queryValue, value)
        }}
      >
        <SelectTrigger size="sm" className="h-10 rounded-lg text-sm">
          <SelectValue placeholder="Order by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  )
}
