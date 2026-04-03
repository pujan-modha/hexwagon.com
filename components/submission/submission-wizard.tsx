"use client"

import { Card } from "~/components/common/card"
import { useSubmissionStore } from "~/stores/submission-store"
import { StepDetails } from "./step-details"
import { StepPlatform } from "./step-platform"
import { StepReview } from "./step-review"
import { StepTheme } from "./step-theme"

const steps = [
  { id: 1, title: "Select Theme" },
  { id: 2, title: "Select Platform" },
  { id: 3, title: "Port Details" },
  { id: 4, title: "Review" },
]

const SubmissionWizard = () => {
  const { step, setStep } = useSubmissionStore()

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={step >= s.id ? "font-medium" : "text-muted-foreground"}>
              {s.title}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${step > s.id ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="p-6">
        {step === 1 && <StepTheme onNext={() => setStep(2)} />}
        {step === 2 && <StepPlatform onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepDetails onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <StepReview onBack={() => setStep(3)} />}
      </Card>
    </div>
  )
}

export { SubmissionWizard }
