"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import { Button } from "~/components/common/button"
import { setOfficialPort } from "~/server/admin/ports/actions"

type OfficialPortButtonProps = {
  portId: string
  isOfficial: boolean
}

export const OfficialPortButton = ({ portId, isOfficial }: OfficialPortButtonProps) => {
  const router = useRouter()

  const { execute, isPending } = useServerAction(setOfficialPort, {
    onSuccess: () => {
      toast.success("Official badge updated")
      router.refresh()
    },
    onError: ({ err }) => toast.error(err.message),
  })

  return (
    <Button
      type="button"
      size="md"
      variant="secondary"
      isPending={isPending}
      disabled={isOfficial}
      onClick={() => execute({ portId })}
    >
      {isOfficial ? "Official Port" : "Mark as Official"}
    </Button>
  )
}
