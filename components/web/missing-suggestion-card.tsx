"use client"

import type { MissingSuggestionType } from "@prisma/client"
import { useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import {
  submitMissingSuggestionLink,
  upsertMissingSuggestionVote,
} from "~/actions/missing-suggestion"
import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"

type MissingSuggestionCardProps = {
  type: MissingSuggestionType
  label: string
  themeName?: string
  platformName?: string
  configName?: string
  themeId?: string
  platformId?: string
  initialCount: number
  className?: string
}

const pluralizePeople = (count: number) =>
  `${count.toLocaleString()} ${count === 1 ? "person" : "people"}`

const getTitle = (type: MissingSuggestionType, label: string) => {
  if (type === "Theme") return `No ${label} theme yet?`
  if (type === "Platform") return `No ${label} platform page yet?`
  if (type === "Port") return `No ${label} yet?`
  return "No matching config yet?"
}

export const MissingSuggestionCard = ({
  type,
  label,
  themeName,
  platformName,
  configName,
  themeId,
  platformId,
  initialCount,
  className,
}: MissingSuggestionCardProps) => {
  const [count, setCount] = useState(initialCount)
  const [hasVoted, setHasVoted] = useState(false)
  const [url, setUrl] = useState("")
  const [hasSubmittedLink, setHasSubmittedLink] = useState(false)

  const input = {
    type,
    label,
    themeName,
    platformName,
    configName,
    themeId,
    platformId,
  }

  const voteAction = useServerAction(upsertMissingSuggestionVote, {
    onSuccess: ({ data }) => {
      setCount(data?.count ?? count)
      setHasVoted(true)
      toast.success("Added your vote.")
    },
    onError: ({ err }) => toast.error(err.message || "Could not add your vote."),
  })

  const linkAction = useServerAction(submitMissingSuggestionLink, {
    onSuccess: () => {
      setUrl("")
      setHasSubmittedLink(true)
      toast.success("Link added for review.")
    },
    onError: ({ err }) => toast.error(err.message || "Could not add that link."),
  })

  const handleLinkSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUrl = url.trim()

    if (!normalizedUrl) return

    linkAction.execute({ ...input, url: normalizedUrl })
  }

  const demandText =
    count > 0 ? `${pluralizePeople(count)} want this.` : "Be first to ask for this."

  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-muted/20 p-4 text-left ${className ?? ""}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{getTitle(type, label)}</div>
          <p className="mt-1 text-sm text-muted-foreground">{demandText}</p>
        </div>

        <Button
          type="button"
          variant={hasVoted ? "secondary" : "primary"}
          size="md"
          isPending={voteAction.isPending}
          disabled={hasVoted || voteAction.isPending}
          onClick={() => voteAction.execute(input)}
          className="shrink-0"
        >
          {hasVoted ? "You want this" : "I want this too"}
        </Button>
      </div>

      <form
        onSubmit={handleLinkSubmit}
        className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
      >
        <Input
          type="url"
          value={url}
          onChange={event => setUrl(event.target.value)}
          placeholder="Paste repo, website, or marketplace link"
          aria-label="Evidence URL"
        />
        <Button
          type="submit"
          variant="secondary"
          size="md"
          isPending={linkAction.isPending}
          disabled={!url.trim() || linkAction.isPending}
        >
          Add link
        </Button>
      </form>

      {hasSubmittedLink ? (
        <p className="mt-2 text-xs text-muted-foreground">Link added for review.</p>
      ) : null}
    </div>
  )
}
