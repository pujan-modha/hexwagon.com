import { type Port, PortStatus } from "@prisma/client"
import { config } from "~/config"
import EmailAdminSubmissionPremium from "~/emails/admin-submission-premium"
import EmailSubmission from "~/emails/submission"
import EmailSubmissionPremium from "~/emails/submission-premium"
import EmailSubmissionPublished from "~/emails/submission-published"
import EmailSubmissionScheduled from "~/emails/submission-scheduled"
import EmailPortSubmitted from "~/emails/port-submitted"
import EmailPortApproved from "~/emails/port-approved"
import EmailPortScheduled from "~/emails/port-scheduled"
import EmailPortRejected from "~/emails/port-rejected"
import EmailSuggestionSubmitted from "~/emails/suggestion-submitted"
import EmailSuggestionApproved from "~/emails/suggestion-approved"
import EmailSuggestionRejected from "~/emails/suggestion-rejected"
import EmailPortEditApproved from "~/emails/port-edit-approved"
import EmailPortEditRejected from "~/emails/port-edit-rejected"
import EmailAdApproved from "~/emails/ad-approved"
import EmailAdRejected from "~/emails/ad-rejected"
import { sendEmail } from "~/lib/email"
import { countSubmittedPorts } from "~/server/web/ports/queries"

type SuggestionWithSubmitter = {
  name: string
  submitter?: {
    email: string
    name: string
  } | null
}

type AdWithContact = Port & {
  email: string
  adminNote?: string | null
}

/**
 * Notify the submitter of a port submission
 */
export const notifySubmitterOfPortSubmitted = async (port: Port) => {
  if (!port.submitterEmail) {
    return
  }

  const to = port.submitterEmail
  const subject = `🙌 Thanks for submitting ${port.name}!`
  const queueLength = await countSubmittedPorts({})

  return await sendEmail({
    to,
    subject,
    react: EmailPortSubmitted({ to, port, queueLength }),
  })
}

/**
 * Notify the submitter of a port scheduled for publication
 */
export const notifySubmitterOfPortScheduled = async (port: Port) => {
  if (!port.submitterEmail || !port.publishedAt || port.status !== PortStatus.Scheduled) {
    return
  }

  const to = port.submitterEmail
  const subject = `Great news! ${port.name} is scheduled for publication on ${config.site.name} 🎉`

  return await sendEmail({
    to,
    subject,
    react: EmailPortScheduled({ to, port }),
  })
}

/**
 * Notify the submitter of a port published
 */
export const notifySubmitterOfPortApproved = async (port: Port) => {
  if (!port.submitterEmail || !port.publishedAt || port.status !== PortStatus.Published) {
    return
  }

  const to = port.submitterEmail
  const subject = `${port.name} has been published on ${config.site.name} 🎉`

  return await sendEmail({
    to,
    subject,
    react: EmailPortApproved({ to, port }),
  })
}

/**
 * Notify the submitter of a port rejected
 */
export const notifySubmitterOfPortRejected = async (port: Port) => {
  if (!port.submitterEmail) {
    return
  }

  const to = port.submitterEmail
  const subject = `${port.name} was not approved on ${config.site.name}`

  return await sendEmail({
    to,
    subject,
    react: EmailPortRejected({ to, port }),
  })
}

/**
 * Notify the submitter of a suggestion submitted
 */
export const notifySubmitterOfSuggestionSubmitted = async (suggestion: SuggestionWithSubmitter) => {
  if (!suggestion.submitter) {
    return
  }

  const to = suggestion.submitter.email
  const subject = `🙌 Thanks for suggesting ${suggestion.name}!`

  return await sendEmail({
    to,
    subject,
    react: EmailSuggestionSubmitted({ to, suggestion }),
  })
}

/**
 * Notify the submitter of a suggestion approved
 */
export const notifySubmitterOfSuggestionApproved = async (suggestion: SuggestionWithSubmitter) => {
  if (!suggestion.submitter) {
    return
  }

  const to = suggestion.submitter.email
  const subject = `🎉 Your suggestion "${suggestion.name}" has been approved!`

  return await sendEmail({
    to,
    subject,
    react: EmailSuggestionApproved({ to, suggestion }),
  })
}

/**
 * Notify the submitter of a suggestion rejected
 */
export const notifySubmitterOfSuggestionRejected = async (suggestion: SuggestionWithSubmitter) => {
  if (!suggestion.submitter) {
    return
  }

  const to = suggestion.submitter.email
  const subject = `Update on your suggestion "${suggestion.name}"`

  return await sendEmail({
    to,
    subject,
    react: EmailSuggestionRejected({ to, suggestion }),
  })
}

/**
 * Notify the editor of a port edit approved
 */
export const notifyEditorOfPortEditApproved = async (portEdit: { editor: { email: string }; port: { name: string | null } }) => {
  const to = portEdit.editor.email
  const subject = `Your edit to "${portEdit.port.name ?? "this port"}" has been approved!`

  return await sendEmail({
    to,
    subject,
    react: EmailPortEditApproved({ to, portEdit }),
  })
}

/**
 * Notify the editor of a port edit rejected
 */
export const notifyEditorOfPortEditRejected = async (portEdit: { editor: { email: string }; port?: { name: string | null } }) => {
  const to = portEdit.editor.email
  const subject = `Update on your edit to "${portEdit.port?.name ?? "this port"}"`

  return await sendEmail({
    to,
    subject,
    react: EmailPortEditRejected({ to, portEdit }),
  })
}

/**
 * Notify the advertiser of an approved ad
 */
export const notifyAdvertiserOfAdApproved = async (ad: AdWithContact) => {
  const to = ad.email
  const subject = `🎉 Your ad for ${ad.name} has been approved!`

  return await sendEmail({
    to,
    subject,
    react: EmailAdApproved({ to, ad }),
  })
}

/**
 * Notify the advertiser of a rejected ad
 */
export const notifyAdvertiserOfAdRejected = async (ad: AdWithContact) => {
  const to = ad.email
  const subject = `Update on your ad for ${ad.name}`

  return await sendEmail({
    to,
    subject,
    react: EmailAdRejected({ to, ad }),
  })
}

/**
 * @deprecated Use notifySubmitterOfPortApproved instead.
 */
export const notifySubmitterOfToolPublished = async (_tool: { name: string; submitterEmail: string | null }) => null

/**
 * @deprecated Use notifySubmitterOfPortScheduled instead.
 */
export const notifySubmitterOfToolScheduled = async (_tool: { name: string; submitterEmail: string | null }) => null

/**
 * Notify the submitter of a premium tool
 *
 * @deprecated - Use port-specific notifications
 */
export const notifySubmitterOfPremiumTool = async (tool: Port) => {
  if (!tool.submitterEmail) {
    return
  }

  const to = tool.submitterEmail
  const subject = `🙌 Thank you for ${tool.isFeatured ? "featuring" : "expediting"} ${tool.name}!`

  return await sendEmail({
    to,
    subject,
    react: EmailSubmissionPremium({ to, tool }),
  })
}

/**
 * Notify the admin of a premium tool
 *
 * @deprecated - Use port-specific notifications
 */
export const notifyAdminOfPremiumTool = async (tool: Port) => {
  const to = config.site.email
  const subject = `New tool ${tool.isFeatured ? "featured" : "expedited"}: ${tool.name}`

  return await sendEmail({
    to,
    subject,
    replyTo: tool.submitterEmail ?? undefined,
    react: EmailAdminSubmissionPremium({ to, tool }),
  })
}
