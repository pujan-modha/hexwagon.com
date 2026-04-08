import { Badge } from "~/components/common/badge"
import { type AdStatusValue, adStatus } from "~/utils/ads"

type AdStatusBadgeProps = {
  status: AdStatusValue
}

export const AdStatusBadge = ({ status }: AdStatusBadgeProps) => {
  const variant =
    status === adStatus.Approved
      ? "success"
      : status === adStatus.Pending || status === adStatus.PendingEdit
        ? "warning"
        : status === adStatus.Rejected
          ? "danger"
          : "soft"

  const label = status === adStatus.PendingEdit ? "Pending Edits" : status

  return <Badge variant={variant}>{label}</Badge>
}
