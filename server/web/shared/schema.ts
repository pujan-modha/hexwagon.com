import { PortStatus, ReportType, SuggestionType } from "@prisma/client";
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { z } from "zod";
import { config } from "~/config";

export const filterParamsSchema = {
  q: parseAsString.withDefault(""),
  sort: parseAsString.withDefault("default"),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(35),
  theme: parseAsArrayOf(parseAsString).withDefault([]),
  platform: parseAsArrayOf(parseAsString).withDefault([]),
  tag: parseAsArrayOf(parseAsString).withDefault([]),
};

export const filterParamsCache = createSearchParamsCache(filterParamsSchema);
export type FilterSchema = Awaited<ReturnType<typeof filterParamsCache.parse>>;

const portUrlMessage = "Please enter a valid port URL";
const allowedAdImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];
const maxAdImageSizeBytes = 8 * 1024 * 1024;

export const repositorySchema = z
  .string()
  .min(1, "Port URL is required")
  .url(portUrlMessage)
  .trim();

export const submitPortSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content: z.string().optional(),
  repositoryUrl: repositorySchema,
  submitterNote: z.string().max(200),
  newsletterOptIn: z.boolean().optional().default(true),
  themeId: z.string().min(1, "Theme is required"),
  platformId: z.string().min(1, "Platform is required"),
  license: z.string().trim().min(1, "License is required").max(120),
});

export const submitSuggestionSchema = z.object({
  type: z.nativeEnum(SuggestionType),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  portId: z.string().min(1),
  parentId: z.string().optional(),
});

export const newsletterSchema = z.object({
  captcha: z.literal("").optional(),
  value: z.string().email("Please enter a valid email address"),
  referring_site: z.string().optional().default(config.site.url),
  utm_source: z.string().optional().default(config.site.name),
  utm_medium: z.string().optional().default("subscribe_form"),
  utm_campaign: z.string().optional().default("organic"),
  double_opt_override: z.string().optional(),
  reactivate_existing: z.boolean().optional(),
  send_welcome_email: z.boolean().optional(),
});

export const reportSchema = z.object({
  type: z.nativeEnum(ReportType),
  message: z.string().optional(),
});

export const feedbackSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export const adDetailsSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Company name is required"),
  description: z.string().min(1, "Description is required").max(160),
  websiteUrl: z.string().url("Please enter a valid website URL"),
  faviconUrl: z
    .string()
    .url("Please enter a valid icon URL")
    .optional()
    .or(z.literal("")),
  faviconFile: z
    .instanceof(File)
    .optional()
    .refine(
      (file) =>
        !file || allowedAdImageMimeTypes.includes(file.type.toLowerCase()),
      "Unsupported image format. Please use PNG, JPG, WebP, GIF, AVIF, or SVG.",
    )
    .refine(
      (file) => !file || file.size <= maxAdImageSizeBytes,
      "Image must be 8MB or smaller",
    ),
  buttonLabel: z.string().optional(),
});

export type SubmitPortSchema = z.infer<typeof submitPortSchema>;
export type SubmitSuggestionSchema = z.infer<typeof submitSuggestionSchema>;
export type CommentSchema = z.infer<typeof commentSchema>;
export type NewsletterSchema = z.infer<typeof newsletterSchema>;
export type ReportSchema = z.infer<typeof reportSchema>;
export type FeedbackSchema = z.infer<typeof feedbackSchema>;
export type AdDetailsSchema = z.infer<typeof adDetailsSchema>;

export const submitToolSchema = submitPortSchema;
export type SubmitToolSchema = SubmitPortSchema;
