import { type Ad, type Port, PortStatus } from "@prisma/client";
import { config } from "~/config";
import EmailPortSubmitted from "~/emails/port-submitted";
import EmailPortApproved from "~/emails/port-approved";
import EmailPortScheduled from "~/emails/port-scheduled";
import EmailPortRejected from "~/emails/port-rejected";
import EmailSuggestionSubmitted from "~/emails/suggestion-submitted";
import EmailSuggestionApproved from "~/emails/suggestion-approved";
import EmailSuggestionRejected from "~/emails/suggestion-rejected";
import EmailPortEditApproved from "~/emails/port-edit-approved";
import EmailPortEditRejected from "~/emails/port-edit-rejected";
import EmailAdApproved from "~/emails/ad-approved";
import EmailAdSubmitted from "~/emails/ad-submitted";
import EmailAdLive from "~/emails/ad-live";
import EmailAdRejected from "~/emails/ad-rejected";
import { sendEmail } from "~/lib/email";
import { countSubmittedPorts } from "~/server/web/ports/queries";

type SuggestionWithSubmitter = {
  name: string;
  submitter?: {
    email: string;
    name: string;
  } | null;
};

type AdWithContact = Ad & {
  adminNote?: string | null;
};

/**
 * Notify the submitter of a port submission
 */
export const notifySubmitterOfPortSubmitted = async (port: Port) => {
  if (!port.submitterEmail) {
    return;
  }

  const to = port.submitterEmail;
  const subject = `🙌 Thanks for submitting ${port.name}!`;
  const queueLength = await countSubmittedPorts({});

  return await sendEmail({
    to,
    subject,
    react: EmailPortSubmitted({ to, port, queueLength }),
  });
};

/**
 * Notify the submitter of a port scheduled for publication
 */
export const notifySubmitterOfPortScheduled = async (port: Port) => {
  if (
    !port.submitterEmail ||
    !port.publishedAt ||
    port.status !== PortStatus.Scheduled
  ) {
    return;
  }

  const to = port.submitterEmail;
  const subject = `Great news! ${port.name} is scheduled for publication on ${config.site.name} 🎉`;

  return await sendEmail({
    to,
    subject,
    react: EmailPortScheduled({ to, port }),
  });
};

/**
 * Notify the submitter of a port published
 */
export const notifySubmitterOfPortApproved = async (port: Port) => {
  if (
    !port.submitterEmail ||
    !port.publishedAt ||
    port.status !== PortStatus.Published
  ) {
    return;
  }

  const to = port.submitterEmail;
  const subject = `${port.name} has been published on ${config.site.name} 🎉`;

  return await sendEmail({
    to,
    subject,
    react: EmailPortApproved({ to, port }),
  });
};

/**
 * Notify the submitter of a port rejected
 */
export const notifySubmitterOfPortRejected = async (port: Port) => {
  if (!port.submitterEmail) {
    return;
  }

  const to = port.submitterEmail;
  const subject = `${port.name} was not approved on ${config.site.name}`;

  return await sendEmail({
    to,
    subject,
    react: EmailPortRejected({ to, port }),
  });
};

/**
 * Notify the submitter of a suggestion submitted
 */
export const notifySubmitterOfSuggestionSubmitted = async (
  suggestion: SuggestionWithSubmitter,
) => {
  if (!suggestion.submitter) {
    return;
  }

  const to = suggestion.submitter.email;
  const subject = `🙌 Thanks for suggesting ${suggestion.name}!`;

  return await sendEmail({
    to,
    subject,
    react: EmailSuggestionSubmitted({ to, suggestion }),
  });
};

/**
 * Notify the submitter of a suggestion approved
 */
export const notifySubmitterOfSuggestionApproved = async (
  suggestion: SuggestionWithSubmitter,
) => {
  if (!suggestion.submitter) {
    return;
  }

  const to = suggestion.submitter.email;
  const subject = `🎉 Your suggestion "${suggestion.name}" has been approved!`;

  return await sendEmail({
    to,
    subject,
    react: EmailSuggestionApproved({ to, suggestion }),
  });
};

/**
 * Notify the submitter of a suggestion rejected
 */
export const notifySubmitterOfSuggestionRejected = async (
  suggestion: SuggestionWithSubmitter,
) => {
  if (!suggestion.submitter) {
    return;
  }

  const to = suggestion.submitter.email;
  const subject = `Update on your suggestion "${suggestion.name}"`;

  return await sendEmail({
    to,
    subject,
    react: EmailSuggestionRejected({ to, suggestion }),
  });
};

/**
 * Notify the editor of a port edit approved
 */
export const notifyEditorOfPortEditApproved = async (portEdit: {
  editor: { email: string };
  port: { name: string | null };
}) => {
  const to = portEdit.editor.email;
  const subject = `Your edit to "${portEdit.port.name ?? "this port"}" has been approved!`;

  return await sendEmail({
    to,
    subject,
    react: EmailPortEditApproved({ to, portEdit }),
  });
};

/**
 * Notify the editor of a port edit rejected
 */
export const notifyEditorOfPortEditRejected = async (portEdit: {
  editor: { email: string };
  port?: { name: string | null };
}) => {
  const to = portEdit.editor.email;
  const subject = `Update on your edit to "${portEdit.port?.name ?? "this port"}"`;

  return await sendEmail({
    to,
    subject,
    react: EmailPortEditRejected({ to, portEdit }),
  });
};

/**
 * Notify the advertiser of an approved ad
 */
export const notifyAdvertiserOfAdApproved = async (
  ad: AdWithContact,
  paymentUrl?: string,
) => {
  const to = ad.email;
  const subject = `🎉 Your ad for ${ad.name} has been approved!`;

  return await sendEmail({
    to,
    subject,
    react: EmailAdApproved({ to, ad, paymentUrl }),
  });
};

/**
 * Notify the advertiser that an ad booking was submitted
 */
export const notifyAdvertiserOfAdSubmitted = async (ad: AdWithContact) => {
  const to = ad.email;
  const subject = `🙌 We received your ad booking for ${ad.name}`;

  return await sendEmail({
    to,
    subject,
    react: EmailAdSubmitted({ to, ad }),
  });
};

/**
 * Notify the advertiser that an ad campaign is confirmed
 */
export const notifyAdvertiserOfAdLive = async (ad: AdWithContact) => {
  const to = ad.email;
  const subject = `✅ Your ad campaign for ${ad.name} is confirmed`;

  return await sendEmail({
    to,
    subject,
    react: EmailAdLive({ to, ad }),
  });
};

/**
 * Notify the advertiser of a rejected ad
 */
export const notifyAdvertiserOfAdRejected = async (ad: AdWithContact) => {
  const to = ad.email;
  const subject = `Update on your ad for ${ad.name}`;

  return await sendEmail({
    to,
    subject,
    react: EmailAdRejected({ to, ad }),
  });
};
