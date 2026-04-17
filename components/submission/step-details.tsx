"use client"

import { useRef } from "react"
import { Button } from "~/components/common/button"
import { Input } from "~/components/common/input"
import { Label } from "~/components/common/label"
import { Switch } from "~/components/common/switch"
import { Textarea } from "~/components/common/textarea"
import { ConfigFontFields } from "~/components/submission/config-font-fields"
import { ConfigScreenshotFields } from "~/components/submission/config-screenshot-fields"
import { LICENSE_SUGGESTIONS } from "~/config/licenses"
import { useSubmissionStore } from "~/stores/submission-store"

type StepDetailsProps = {
  onNext: () => void
  onBack: () => void
}

const StepDetails = ({ onNext, onBack }: StepDetailsProps) => {
  const {
    kind,
    name,
    description,
    content,
    repositoryUrl,
    license,
    fonts,
    screenshots,
    submitterNote,
    newsletterOptIn,
    setDetails,
  } = useSubmissionStore()

  const isConfig = kind === "config"
  const configUploadPathRef = useRef(`configs/submissions/${Date.now()}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="submission-name">{isConfig ? "Config Name" : "Port Name"}</Label>
        <Input
          id="submission-name"
          value={name}
          onChange={e => setDetails({ name: e.target.value })}
          placeholder={isConfig ? "e.g., Catppuccin dotfiles" : "e.g., Dracula for VS Code"}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="submission-description">Short Description</Label>
        <Input
          id="submission-description"
          value={description}
          onChange={e => setDetails({ description: e.target.value })}
          placeholder={
            isConfig ? "Brief description of this config" : "Brief description of this port"
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="submission-content">Full Description (Markdown)</Label>
        <Textarea
          id="submission-content"
          value={content}
          onChange={e => setDetails({ content: e.target.value })}
          placeholder="Detailed description, installation instructions, setup notes, etc."
          rows={6}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="repository-url">{isConfig ? "Repository URL" : "Port URL"}</Label>
        <Input
          id="repository-url"
          type="url"
          value={repositoryUrl}
          onChange={e => setDetails({ repositoryUrl: e.target.value })}
          placeholder="https://example.com/..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="submission-license">License {isConfig ? "(optional)" : ""}</Label>
        <Input
          id="submission-license"
          value={license}
          onChange={e => setDetails({ license: e.target.value })}
          placeholder="MIT"
          list="submission-license-suggestions"
        />
        <datalist id="submission-license-suggestions">
          {LICENSE_SUGGESTIONS.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      {isConfig ? (
        <>
          <ConfigFontFields
            fonts={fonts}
            onChange={nextFonts => setDetails({ fonts: nextFonts })}
          />

          <ConfigScreenshotFields
            screenshots={screenshots}
            onChange={nextScreenshots => setDetails({ screenshots: nextScreenshots })}
            uploadPath={configUploadPathRef.current}
          />
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="submitter-note">Note for moderators</Label>
        <Textarea
          id="submitter-note"
          value={submitterNote}
          onChange={e => setDetails({ submitterNote: e.target.value })}
          placeholder="Anything review team should know?"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="newsletter-opt-in"
          checked={newsletterOptIn}
          onCheckedChange={checked => setDetails({ newsletterOptIn: checked })}
        />
        <Label htmlFor="newsletter-opt-in">Subscribe to newsletter</Label>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!name || !repositoryUrl || (!isConfig && !license)}>
          Next
        </Button>
      </div>
    </div>
  )
}

export { StepDetails }
