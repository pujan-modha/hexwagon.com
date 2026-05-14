"use client"

import { MissingSuggestionStatus } from "@prisma/client"
import { toast } from "sonner"
import { useServerAction } from "zsa-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select"
import { updateMissingSuggestionStatus } from "~/server/admin/missing-suggestions/actions"

type MissingSuggestionStatusSelectProps = {
  id: string
  status: MissingSuggestionStatus
}

export const MissingSuggestionStatusSelect = ({
  id,
  status,
}: MissingSuggestionStatusSelectProps) => {
  const action = useServerAction(updateMissingSuggestionStatus, {
    onSuccess: () => toast.success("Status updated."),
    onError: () => toast.error("Could not update status."),
  })

  return (
    <Select
      value={status}
      onValueChange={value => action.execute({ id, status: value as MissingSuggestionStatus })}
    >
      <SelectTrigger size="sm" className="h-8 w-32 rounded-md">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(MissingSuggestionStatus).map(value => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
