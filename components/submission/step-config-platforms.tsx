"use client"

import Link from "next/link"
import { useCallback } from "react"
import { searchPlatformsAction } from "~/actions/widget-search"
import { Button } from "~/components/common/button"
import { EntityMultiSelect } from "~/components/submission/entity-multi-select"
import { useSubmissionStore } from "~/stores/submission-store"

type StepConfigPlatformsProps = {
  onNext: () => void
  onBack: () => void
}

const StepConfigPlatforms = ({ onNext, onBack }: StepConfigPlatformsProps) => {
  const { platformIds, platformNames, setPlatforms } = useSubmissionStore()

  const selectedPlatforms = platformIds.map((id, index) => ({
    id,
    name: platformNames[index] ?? "Unknown platform",
  }))

  const handleSearch = useCallback(async (query: string) => {
    const [results, error] = await searchPlatformsAction({ query })
    if (error) return []
    return results ?? []
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <EntityMultiSelect
        addLabel="Add another platform..."
        emptyLabel="Select one or more platforms..."
        inputLabel="Platforms"
        placeholder="Search platforms..."
        searchEmptyText="No platform found."
        fallbackIcon="lucide/globe"
        selected={selectedPlatforms}
        onSearch={handleSearch}
        onChange={entries => setPlatforms(entries.map(({ id, name }) => ({ id, name })))}
      />

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
        <Button onClick={onNext} disabled={!platformIds.length}>
          Next
        </Button>
      </div>
    </div>
  )
}

export { StepConfigPlatforms }
