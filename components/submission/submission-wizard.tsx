"use client"

import { parseAsStringEnum, useQueryState } from "nuqs"
import { useEffect } from "react"
import { Card } from "~/components/common/card"
import { type SubmissionKind, useSubmissionStore } from "~/stores/submission-store"
import { StepConfigPlatforms } from "./step-config-platforms"
import { StepConfigThemes } from "./step-config-themes"
import { StepDetails } from "./step-details"
import { StepPlatform } from "./step-platform"
import { StepReview } from "./step-review"
import { StepTheme } from "./step-theme"
import { StepType } from "./step-type"

const stepsByKind: Record<SubmissionKind, Array<{ id: number; title: string }>> = {
  port: [
    { id: 1, title: "Select Theme" },
    { id: 2, title: "Select Platform" },
    { id: 3, title: "Port Details" },
    { id: 4, title: "Review" },
  ],
  config: [
    { id: 1, title: "Select Platforms" },
    { id: 2, title: "Select Themes" },
    { id: 3, title: "Config Details" },
    { id: 4, title: "Review" },
  ],
}

const SubmissionWizard = () => {
  const { kind, step, setStep, setKind } = useSubmissionStore()
  const [kindQuery, setKindQuery] = useQueryState(
    "type",
    parseAsStringEnum<SubmissionKind>(["port", "config"]),
  )

  useEffect(() => {
    if (kind === null && kindQuery) {
      setKind(kindQuery)
    }
  }, [kind, kindQuery, setKind])

  const handleSelectKind = async (nextKind: SubmissionKind) => {
    setKind(nextKind)
    await setKindQuery(nextKind)
  }

  const handleResetKind = async () => {
    setKind(null)
    await setKindQuery(null)
  }

  const steps = kind ? stepsByKind[kind] : []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {kind ? (
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= entry.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <span className={step >= entry.id ? "font-medium" : "text-muted-foreground"}>
                {entry.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`h-px w-8 ${step > entry.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
      ) : null}

      {kind === null ? <StepType onSelect={handleSelectKind} /> : null}

      {kind === "port" ? (
        <Card className="p-6">
          {step === 1 ? <StepTheme onNext={() => setStep(2)} onBack={handleResetKind} /> : null}
          {step === 2 ? <StepPlatform onNext={() => setStep(3)} onBack={() => setStep(1)} /> : null}
          {step === 3 ? <StepDetails onNext={() => setStep(4)} onBack={() => setStep(2)} /> : null}
          {step === 4 ? <StepReview onBack={() => setStep(3)} /> : null}
        </Card>
      ) : null}

      {kind === "config" ? (
        <Card className="p-6">
          {step === 1 ? (
            <StepConfigPlatforms onNext={() => setStep(2)} onBack={handleResetKind} />
          ) : null}
          {step === 2 ? (
            <StepConfigThemes onNext={() => setStep(3)} onBack={() => setStep(1)} />
          ) : null}
          {step === 3 ? <StepDetails onNext={() => setStep(4)} onBack={() => setStep(2)} /> : null}
          {step === 4 ? <StepReview onBack={() => setStep(3)} /> : null}
        </Card>
      ) : null}
    </div>
  )
}

export { SubmissionWizard }
