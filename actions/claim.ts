"use server"

import { getUrlHostname } from "@primoui/utils"
import { revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { after } from "next/server"
import { z } from "zod"
import { config } from "~/config"
import EmailVerifyDomain from "~/emails/verify-domain"
import { auth } from "~/lib/auth"
import { sendEmail } from "~/lib/email"
import { getIP, isRateLimited } from "~/lib/rate-limiter"
import { userProcedure } from "~/lib/safe-actions"
import { db } from "~/services/db"

/**
 * Check rate limiting for claim actions
 */
const checkRateLimit = async (action: string) => {
  const ip = await getIP()
  const rateLimitKey = `claim-${action}:${ip}`

  if (await isRateLimited(rateLimitKey, "claim")) {
    throw new Error("Too many requests. Please try again later")
  }

  return { ip, rateLimitKey }
}

/**
 * Get port by slug and verify it's claimable
 */
const getClaimablePort = async (slug: string) => {
  const port = await db.port.findUnique({
    where: { slug },
  })

  if (!port) {
    throw new Error("Port not found")
  }

  if (port.authorId) {
    throw new Error("This port has already been claimed")
  }

  return port
}

/**
 * Verify that email domain matches port link host domain when possible.
 */
const verifyEmailDomain = (email: string, portRepositoryUrl: string) => {
  const portDomain = getUrlHostname(portRepositoryUrl)
  const emailDomain = email.split("@")[1]
  const isPublicGitHost = ["github.com", "gitlab.com", "bitbucket.org"].includes(portDomain)

  if (!isPublicGitHost && portDomain !== emailDomain) {
    throw new Error("Email domain must match the port link domain")
  }
}

/**
 * Generate and send OTP email
 */
const generateAndSendOtp = async (email: string) => {
  const { token: otp } = await auth.api.generateOneTimeToken({
    headers: await headers(),
  })

  if (!otp) {
    throw new Error("Failed to send OTP")
  }

  // Send OTP email
  after(async () => {
    const to = email
    const subject = `Your ${config.site.name} Verification Code`
    await sendEmail({ to, subject, react: EmailVerifyDomain({ to, otp }) })
  })

  return otp
}

/**
 * Claim port for a user and revalidate cache
 */
const claimPortForUser = async (portId: string, userId: string, slug: string) => {
  await db.port.update({
    where: { id: portId },
    data: { authorId: userId },
  })

  // Revalidate ports
  revalidateTag("ports", "max")
  revalidateTag(`port-${slug}`, "max")
}

/**
 * Send OTP to verify domain ownership
 */
export const sendPortClaimOtp = userProcedure
  .createServerAction()
  .input(z.object({ portSlug: z.string(), email: z.string().email() }))
  .handler(async ({ input: { portSlug: slug, email } }) => {
    // Check rate limiting
    await checkRateLimit("otp")

    // Get and validate port
    const port = await getClaimablePort(slug)

    if (!port.repositoryUrl) {
      throw new Error("This port cannot be claimed because it does not have a port URL")
    }

    // Verify email domain
    verifyEmailDomain(email, port.repositoryUrl)

    // Generate and send OTP
    await generateAndSendOtp(email)

    return { success: true }
  })

/**
 * Verify OTP and claim port
 */
export const verifyPortClaimOtp = userProcedure
  .createServerAction()
  .input(z.object({ portSlug: z.string(), otp: z.string() }))
  .handler(async ({ input: { portSlug: slug, otp } }) => {
    // Check rate limiting
    await checkRateLimit("verify")

    // Get and validate port
    const port = await getClaimablePort(slug)

    // Verify otp
    const { user } = await auth.api.verifyOneTimeToken({
      body: { token: otp },
      headers: await headers(),
    })

    // Claim port and revalidate
    await claimPortForUser(port.id, user.id, slug)

    return { success: true }
  })
