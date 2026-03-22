import { Skeleton } from "~/components/common/skeleton"

export const ToolListingSkeleton = () => {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  )
}
