"use client"

import { experimental_useObject as useObject } from "@ai-sdk/react"
import { isValidUrl } from "@primoui/utils"
import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { descriptionSchema } from "~/server/admin/shared/schema"
import type { PortSchema } from "~/server/admin/ports/schema"

export const PortGenerateDescription = () => {
  const errorMessage = "Something went wrong. Please check the console for more details."
  const successMessage = "Description generated successfully. Please save the port to update."

  const { watch, setValue } = useFormContext<PortSchema>()
  const [url] = watch(["websiteUrl"])

  const { object, submit, stop, isLoading } = useObject({
    api: "/api/ai/generate-description",
    schema: descriptionSchema,
    onFinish: ({ error }) => {
      error ? toast.error(errorMessage) : toast.success(successMessage)
    },
    onError: () => {
      toast.error(errorMessage)
    },
  })

  useEffect(() => {
    if (object) {
      setValue("description", object.description)
    }
  }, [object, setValue])

  const handleGenerateDescription = () => {
    if (isValidUrl(url)) {
      submit({ url })
    } else {
      toast.error("Invalid URL. Please enter a valid URL.")
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      prefix={isLoading ? <Icon name="lucide/loader" className="animate-spin" /> : <Icon name="lucide/sparkles" />}
      disabled={!isValidUrl(url)}
      onClick={() => (isLoading ? stop() : handleGenerateDescription())}
    >
      {isLoading ? "Stop Generating" : "Generate Description"}
    </Button>
  )
}
