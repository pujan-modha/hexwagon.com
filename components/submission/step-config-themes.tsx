"use client"

import Link from "next/link"
import { useCallback } from "react"
import { searchThemesAction } from "~/actions/widget-search"
import { Button } from "~/components/common/button"
import { EntityMultiSelect } from "~/components/submission/entity-multi-select"
import { useSubmissionStore } from "~/stores/submission-store"

type StepConfigThemesProps = {
  onNext: () => void
  onBack: () => void
}

const StepConfigThemes = ({ onNext, onBack }: StepConfigThemesProps) => {
  const { themeIds, themeNames, setThemes } = useSubmissionStore()

  const selectedThemes = themeIds.map((id, index) => ({
    id,
    name: themeNames[index] ?? "Unknown theme",
  }))

  const handleSearch = useCallback(async (query: string) => {
    const [results, error] = await searchThemesAction({ query })
    if (error) return []
    return results ?? []
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <EntityMultiSelect
        addLabel="Add another theme..."
        emptyLabel="Select one or more themes..."
        inputLabel="Themes"
        placeholder="Search themes..."
        searchEmptyText="No theme found."
        fallbackIcon="lucide/hash"
        selected={selectedThemes}
        onSearch={handleSearch}
        onChange={entries => setThemes(entries.map(({ id, name }) => ({ id, name })))}
      />

      <p className="text-sm text-muted-foreground">
        Can&apos;t find your theme?{" "}
        <Link href="/suggest?type=Theme" className="underline hover:text-foreground">
          Suggest a new theme
        </Link>
      </p>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!themeIds.length}>
          Next
        </Button>
      </div>
    </div>
  )
}

export { StepConfigThemes }
