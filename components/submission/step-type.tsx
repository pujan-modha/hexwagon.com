"use client"

import type { ComponentProps } from "react"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { Note } from "~/components/common/note"
import type { SubmissionKind } from "~/stores/submission-store"

type StepTypeProps = {
  onSelect: (kind: SubmissionKind) => void
}

const options: Array<{
  kind: SubmissionKind
  title: string
  description: string
  icon: ComponentProps<typeof Icon>["name"]
}> = [
  {
    kind: "port",
    title: "Theme Port",
    description: "One theme for one platform.",
    icon: "lucide/hash",
  },
  {
    kind: "config",
    title: "Config",
    description: "Dotfiles or setup tagged to many themes and platforms.",
    icon: "lucide/blocks",
  },
]

const StepType = ({ onSelect }: StepTypeProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">What do you want to submit?</h3>
        <Note>Choose submission type first. Flow adapts after this.</Note>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {options.map(option => (
          <Card key={option.kind} className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                <Icon name={option.icon} className="size-5 text-muted-foreground" />
              </span>

              <div className="flex flex-col gap-1">
                <h4 className="font-medium">{option.title}</h4>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>

            <Button onClick={() => onSelect(option.kind)} className="mt-auto">
              Continue with {option.title}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { StepType }
