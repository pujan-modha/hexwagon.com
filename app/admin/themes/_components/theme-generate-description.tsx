"use client"

import { experimental_useObject as useObject } from "@ai-sdk/react"
import { isValidUrl } from "@primoui/utils"
import { useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { descriptionSchema } from "~/server/admin/shared/schema"
import type { ThemeSchema } from "~/server/admin/themes/schema"

export const ThemeGenerateDescription = () => {
  const errorMessage = "Something went wrong. Please check the console for more details."
  const successMessage = "Description generated successfully. Please save the theme to update."

  const { watch, setValue } = useFormContext<ThemeSchema>()
  const [url] = watch(["websiteUrl"])

  const { object, submit, stop, isLoading } = useObject({
    api: "/api/ai/generate-description",
    schema: descriptionSchema,
    onFinish: ({ error }) => {
      error ? toast.error(errorMessage) : toast.success(successMessage)
    },
    onError: () => toast.error(errorMessage),
  })

  useEffect(() => {
    if (object) setValue("description", object.description)
  }, [object, setValue])

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      prefix={isLoading ? <Icon name="lucide/loader" className="animate-spin" /> : <Icon name="lucide/sparkles" />}
      disabled={!isValidUrl(url)}
      onClick={() => {
        if (isLoading) {
          stop()
        } else if (isValidUrl(url)) {
          submit({ url })
        } else {
          toast.error("Invalid URL. Please enter a valid URL.")
        }
      }}
    >
      {isLoading ? "Stop Generating" : "Generate Description"}
    </Button>
  )
}
