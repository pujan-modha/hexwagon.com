import { slugify } from "@primoui/utils"
import type { Prisma } from "@prisma/client"
import { githubClient } from "~/services/github"

/**
 * Fetches the repository data for a port and returns the data
 * in a format that can be used to update the port.
 *
 * @param repository - The repository URL to fetch the data for.
 * @returns The repository data for the port.
 */
export const getPortRepositoryData = async (repository: string) => {
  const repo = await githubClient.queryRepository(repository)
  const selfHostedTopics = ["selfhosted", "self-hosted"]

  if (!repo) return null

  return {
    stars: repo.stars,
    forks: repo.forks,
    score: repo.score,
    firstCommitDate: repo.createdAt,
    lastCommitDate: repo.pushedAt,
    isSelfHosted: repo.topics.some(topic => selfHostedTopics.includes(topic)) ? true : undefined,

    // License
    license: repo.license
      ? {
          connectOrCreate: {
            where: { name: repo.license },
            create: { name: repo.license, slug: slugify(repo.license).replace(/-0$/, "") },
          },
        }
      : undefined,

    // Tags
    tags: {
      connectOrCreate: repo.topics.map(slug => ({
        where: { slug: slugify(slug) },
        create: { slug: slugify(slug) },
      })),
    },
  } satisfies Prisma.PortUpdateInput
}

/**
 * @deprecated Use getPortRepositoryData instead.
 */
export const getToolRepositoryData = getPortRepositoryData
