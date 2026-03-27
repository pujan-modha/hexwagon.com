import { Badge } from "~/components/common/badge"
import { adStatus, type AdStatusValue } from "~/utils/ads"

type AdStatusBadgeProps = {
  status: AdStatusValue
}

export const AdStatusBadge = ({ status }: AdStatusBadgeProps) => {
  const variant =
    status === adStatus.Approved
      ? "success"
      : status === adStatus.Pending
        ? "warning"
        : status === adStatus.Rejected
          ? "danger"
          : "soft"

  return <Badge variant={variant}>{status}</Badge>
}