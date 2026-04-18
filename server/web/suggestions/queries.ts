import { db } from "~/services/db"

export const findSuggestionsByUser = async (userId: string) => {
  return db.suggestion.findMany({
    where: { submitterId: userId },
    orderBy: { createdAt: "desc" },
  })
}
