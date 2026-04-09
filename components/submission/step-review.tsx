"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { submitPort } from "~/actions/submit"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { useSubmissionStore } from "~/stores/submission-store"

type StepReviewProps = {
  onBack: () => void
}

const StepReview = ({ onBack }: StepReviewProps) => {
  const router = useRouter()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [redirectIn, setRedirectIn] = useState(2)

  const {
    themeName,
    platformName,
    name,
    description,
    content,
    repositoryUrl,
    license,
    submitterNote,
    newsletterOptIn,
    reset,
  } = useSubmissionStore()

  const { execute, isPending } = useServerAction(submitPort, {
    onSuccess: ({ data }) => {
      if (!data?.id) {
        toast.error("Submission completed but no port ID was returned.")
        setIsFailed(true)
        return
      }

      setIsFailed(false)
      setIsSubmitted(true)
      setRedirectIn(2)
      toast.success("Submission received. Redirecting to your dashboard.")
    },
    onError: ({ err }) => {
      setIsFailed(true)
      toast.error(err.message)
    },
  })

  useEffect(() => {
    router.prefetch("/dashboard")
  }, [router])

  useEffect(() => {
    if (!isSubmitted) {
      return
    }

    const timeout = setTimeout(() => {
      reset()
      router.push("/dashboard")
    }, 1700)

    const interval = setInterval(() => {
      setRedirectIn(current => Math.max(0, current - 1))
    }, 1000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [isSubmitted, router])

  const handleSubmit = () => {
    setIsFailed(false)

    const { themeId, platformId } = useSubmissionStore.getState()

    if (!themeId || !platformId) {
      setIsFailed(true)
      toast.error("Please select a theme and platform before submitting.")
      return
    }

    execute({
      themeId,
      platformId,
      name,
      description,
      content,
      repositoryUrl,
      license,
      submitterNote,
      newsletterOptIn,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {(isPending || isSubmitted || isFailed) && (
        <Card className="p-4">
          <div className="flex items-start gap-3 text-sm">
            {isSubmitted ? (
              <Icon name="lucide/check" className="mt-0.5 size-4 text-emerald-500" />
            ) : isFailed ? (
              <Icon name="lucide/triangle-alert" className="mt-0.5 size-4 text-destructive" />
            ) : (
              <Icon name="lucide/loader" className="mt-0.5 size-4 animate-spin" />
            )}

            <div className="flex flex-col gap-1">
              {isSubmitted ? (
                <>
                  <p className="font-medium">Port submitted successfully.</p>
                  <p className="text-muted-foreground">
                    Redirecting to your dashboard in {redirectIn} second
                    {redirectIn === 1 ? "" : "s"}...
                  </p>
                </>
              ) : isFailed ? (
                <>
                  <p className="font-medium text-destructive">Submission failed.</p>
                  <p className="text-muted-foreground">
                    Please review your details and try again.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Submitting your port...</p>
                  <p className="text-muted-foreground">
                    We are validating details and creating your submission.
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Review Your Submission</h3>

        <div className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Theme:</span>
            <span>{themeName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Platform:</span>
            <span>{platformName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Port Name:</span>
            <span>{name}</span>
          </div>
          {description && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Description:</span>
              <span>{description}</span>
            </div>
          )}
          {repositoryUrl && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Port URL:</span>
              <Link
                href={repositoryUrl}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {repositoryUrl}
              </Link>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">License:</span>
            <span>{license}</span>
          </div>
          {submitterNote && (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Moderator note:</span>
              <span>{submitterNote}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">Newsletter:</span>
            <span>{newsletterOptIn ? "Yes" : "No"}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack} disabled={isPending || isSubmitted}>
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          isPending={isPending}
          disabled={isSubmitted}
          prefix={isSubmitted ? <Icon name="lucide/check" /> : undefined}
        >
          {isSubmitted ? "Submitted" : "Submit Port"}
        </Button>
      </div>
    </div>
  )
}

export { StepReview }
