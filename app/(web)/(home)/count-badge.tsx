import { formatNumber } from "@primoui/utils";
import { PortStatus } from "@prisma/client";
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from "next/cache";
import { Badge } from "~/components/common/badge";
import { Ping } from "~/components/common/ping";
import { db } from "~/services/db";

const getRoundedPortFloor = (count: number) => {
  if (count < 100) return Math.max(10, Math.floor(count / 10) * 10);
  if (count < 1000) return Math.floor(count / 50) * 50;
  if (count < 10000) return Math.floor(count / 100) * 100;
  return Math.floor(count / 1000) * 1000;
};

const getCounts = async () => {
  "use cache";

  cacheTag("ports-count");
  cacheLife("minutes");

  return db.port.count({
    where: { status: PortStatus.Published },
  });
};

const CountBadge = async () => {
  const count = await getCounts();
  const roundedCount = getRoundedPortFloor(count);

  return (
    <Badge prefix={<Ping />} className="order-first">
      {`${formatNumber(roundedCount)}+ ports`}
    </Badge>
  );
};

const CountBadgeSkeleton = () => {
  return (
    <Badge
      prefix={<Ping />}
      className="min-w-20 order-first pointer-events-none animate-pulse"
    >
      &nbsp;
    </Badge>
  );
};

export { CountBadge, CountBadgeSkeleton };
