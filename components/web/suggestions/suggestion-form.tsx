"use client"

import type { MissingSuggestionType } from "@prisma/client"
import { useState } from "react"
import { toast } from "sonner"
import {
  submitMissingSuggestionLink,
  upsertMissingSuggestionVote,
} from "~/actions/missing-suggestion"
import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import { RadioGroup, RadioGroupItem } from "~/components/common/radio-group"
import { Textarea } from "~/components/common/textarea"

type SuggestionFormProps = {
  defaultType?: "Theme" | "Platform" | "Config"
  onSuccess?: () => void
}

const SuggestionForm = ({ defaultType = "Theme", onSuccess }: SuggestionFormProps) => {
  const [type, setType] = useState<MissingSuggestionType>(defaultType)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Name is required")
      return
    }

    setIsLoading(true)
    try {
      const input = {
        type,
        label: name.trim(),
        configName: type === "Config" ? name.trim() : undefined,
      }

      await upsertMissingSuggestionVote(input)

      if (websiteUrl.trim()) {
        await submitMissingSuggestionLink({
          ...input,
          url: websiteUrl.trim(),
        })
      }

      setName("")
      setDescription("")
      setWebsiteUrl("")
      onSuccess?.()
      toast.success("Thank you for your suggestion!")
    } catch {
      toast.error("Failed to submit suggestion")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-md mx-auto">
      <div className="flex flex-col gap-2">
        <Label>What are you suggesting?</Label>
        <RadioGroup
          value={type}
          onValueChange={value => setType(value as MissingSuggestionType)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Theme" id="type-theme" />
            <Label htmlFor="type-theme" className="font-normal">
              Theme
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Platform" id="type-platform" />
            <Label htmlFor="type-platform" className="font-normal">
              Platform
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Config" id="type-config" />
            <Label htmlFor="type-config" className="font-normal">
              Config
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggestion-name">Name</Label>
        <Input
          id="suggestion-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={`e.g., ${type === "Theme" ? "Nord" : type === "Platform" ? "VS Code" : "LazyVim Starter"}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggestion-description">Description (optional)</Label>
        <Textarea
          id="suggestion-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suggestion-url">Website URL (optional)</Label>
        <Input
          id="suggestion-url"
          type="url"
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Submitting..." : "Submit Suggestion"}
      </Button>
    </form>
  )
}

export { SuggestionForm }
