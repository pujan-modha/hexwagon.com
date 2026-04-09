"use client"

import { useState } from "react"
import { Button } from "~/components/common/button"
import { Icon } from "~/components/common/icon"
import { AdFormDialog } from "./ad-form-dialog"

export const CreateAdButton = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-3 text-xs"
        prefix={<Icon name="lucide/plus" />}
      >
        Create Ad
      </Button>

      <AdFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
