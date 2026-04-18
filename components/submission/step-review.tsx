"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { submitConfig, submitPort } from "~/actions/submit"
import { Button } from "~/components/common/button"
import { Card } from "~/components/common/card"
import { Icon } from "~/components/common/icon"
import { Link } from "~/components/common/link"
import { useSubmissionStore } from "~/stores/submission-store"

type StepReviewProps = {
  onBack: () => void
}

type SummaryRow = {
  label: string
  value: ReactNode
}

const StepReview = ({ onBack }: StepReviewProps) => {
  const router = useRouter()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFailed, setIsFailed] = useState(false)

  const {
    kind,
    themeName,
    platformName,
    themeNames,
    platformNames,
    name,
    description,
    content,
    repositoryUrl,
    license,
    fonts,
    screenshots,
    submitterNote,
    newsletterOptIn,
    reset,
  } = useSubmissionStore()

  const isConfig = kind === "config"
  const themeSummary = isConfig ? themeNames.join(", ") : themeName
  const platformSummary = isConfig ? platformNames.join(", ") : platformName

  const handleSuccess = (entityName: string) => {
    setIsFailed(false)
    setIsSubmitted(true)
    toast.success(`${entityName} submission received. Redirecting to your dashboard.`)
    reset()
    router.replace("/dashboard")
  }

  const portAction = useServerAction(submitPort, {
    onSuccess: ({ data }) => {
      if (!data?.id) {
        toast.error("Submission completed but no port ID was returned.")
        setIsFailed(true)
        return
      }

      handleSuccess("Port")
    },
    onError: ({ err }) => {
      setIsFailed(true)
      toast.error(err.message)
    },
  })

  const configAction = useServerAction(submitConfig, {
    onSuccess: ({ data }) => {
      if (!data?.id) {
        toast.error("Submission completed but no config ID was returned.")
        setIsFailed(true)
        return
      }

      handleSuccess("Config")
    },
    onError: ({ err }) => {
      setIsFailed(true)
      toast.error(err.message)
    },
  })

  const isPending = portAction.isPending || configAction.isPending

  useEffect(() => {
    router.prefetch("/dashboard")
  }, [router])

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const rows: SummaryRow[] = [
      { label: isConfig ? "Platforms:" : "Platform:", value: platformSummary },
      { label: isConfig ? "Themes:" : "Theme:", value: themeSummary },
      { label: isConfig ? "Config Name:" : "Port Name:", value: name },
    ]

    if (description) {
      rows.push({ label: "Description:", value: description })
    }

    if (repositoryUrl) {
      rows.push({
        label: isConfig ? "Repository URL:" : "Port URL:",
        value: (
          <Link
            href={repositoryUrl}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {repositoryUrl}
          </Link>
        ),
      })
    }

    if (license) {
      rows.push({ label: "License:", value: license })
    }

    if (isConfig && fonts.length) {
      rows.push({ label: "Fonts:", value: `${fonts.length} added` })
    }

    if (isConfig && screenshots.length) {
      rows.push({ label: "Screenshots:", value: `${screenshots.length} added` })
    }

    if (submitterNote) {
      rows.push({ label: "Moderator note:", value: submitterNote })
    }

    rows.push({ label: "Newsletter:", value: newsletterOptIn ? "Yes" : "No" })

    return rows
  }, [
    description,
    fonts.length,
    isConfig,
    license,
    name,
    newsletterOptIn,
    platformSummary,
    repositoryUrl,
    screenshots.length,
    submitterNote,
    themeSummary,
  ])

  const handleSubmit = () => {
    setIsFailed(false)

    const state = useSubmissionStore.getState()

    if (state.kind === "port") {
      if (!state.themeId || !state.platformId) {
        setIsFailed(true)
        toast.error("Please select a theme and platform before submitting.")
        return
      }

      portAction.execute({
        themeId: state.themeId,
        platformId: state.platformId,
        name: state.name,
        description: state.description,
        content: state.content,
        repositoryUrl: state.repositoryUrl,
        license: state.license,
        submitterNote: state.submitterNote,
        newsletterOptIn: state.newsletterOptIn,
      })
      return
    }

    if (state.kind === "config") {
      if (!state.themeIds.length || !state.platformIds.length) {
        setIsFailed(true)
        toast.error("Please select at least one theme and one platform before submitting.")
        return
      }

      configAction.execute({
        themeIds: state.themeIds,
        platformIds: state.platformIds,
        name: state.name,
        description: state.description,
        content: state.content,
        repositoryUrl: state.repositoryUrl,
        license: state.license,
        fonts: state.fonts,
        screenshots: state.screenshots,
        submitterNote: state.submitterNote,
        newsletterOptIn: state.newsletterOptIn,
      })
    }
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
                  <p className="font-medium">
                    {isConfig ? "Config" : "Port"} submitted successfully.
                  </p>
                  <p className="text-muted-foreground">Redirecting to your dashboard...</p>
                </>
              ) : isFailed ? (
                <>
                  <p className="font-medium text-destructive">Submission failed.</p>
                  <p className="text-muted-foreground">Please review your details and try again.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Submitting your {isConfig ? "config" : "port"}...</p>
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
          {summaryRows.map(row => (
            <div key={row.label} className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}

          {content ? (
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Has markdown content:</span>
              <span>Yes</span>
            </div>
          ) : null}
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
          {isSubmitted ? "Submitted" : `Submit ${isConfig ? "Config" : "Port"}`}
        </Button>
      </div>
    </div>
  )
}

export { StepReview }
