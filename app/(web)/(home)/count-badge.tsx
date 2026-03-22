import { formatNumber } from "@primoui/utils"
import { PortStatus } from "@prisma/client"
import { subDays } from "date-fns"
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache"
import plur from "plur"
import { Badge } from "~/components/common/badge"
import { Link } from "~/components/common/link"
import { Ping } from "~/components/common/ping"
import { db } from "~/services/db"

const getCounts = async () => {
  "use cache"

  cacheTag("ports-count")
  cacheLife("minutes")

  return await db.$transaction([
    db.port.count({
      where: { status: PortStatus.Published },
    }),

    db.port.count({
      where: { status: PortStatus.Published, publishedAt: { gte: subDays(new Date(), 7) } },
    }),
  ])
}

const CountBadge = async () => {
  const [count, newCount] = await getCounts()

  return (
    <Badge prefix={<Ping />} className="order-first" asChild>
      <Link href="/themes">
        {newCount
          ? `${formatNumber(newCount)} new ${plur("port", newCount)} added`
          : `${formatNumber(count)}+ theme ports`}
      </Link>
    </Badge>
  )
}

const CountBadgeSkeleton = () => {
  return (
    <Badge prefix={<Ping />} className="min-w-20 order-first pointer-events-none animate-pulse">
      &nbsp;
    </Badge>
  )
}

export { CountBadge, CountBadgeSkeleton }
