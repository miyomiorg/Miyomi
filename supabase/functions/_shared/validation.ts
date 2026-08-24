import { z } from "https://esm.sh/zod@3.23.8";

const sketchyDomains = ["bit.ly", "tinyurl.com", "t.co", "shorte.st", "adf.ly"];

const validateUrl = (val: string | undefined | null) => {
  if (!val) return true;
  if (val.startsWith("/")) return true;
  try {
    const url = new URL(val);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (sketchyDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) return false;
    return true;
  } catch (e) {
    return false;
  }
};

const optionalUrl = z.string().trim().max(2048).optional().nullable().refine(validateUrl, {
  message: "Invalid URL or sketchy domain detected",
});

const requiredUrl = z.string().trim().min(1).max(2048).refine(validateUrl, {
  message: "Valid URL required (http/https only, no URL shorteners)",
});

export const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000, "Message too long"),
  page: z.string().trim().max(2048).optional().nullable(),
  timestamp: z.string().optional(),
  turnstileToken: z.string().optional()
});

export const reportSchema = z.object({
  targetType: z.enum(["app", "extension", "guide", "page", "other"]),
  targetId: z.string().max(100).optional().nullable(),
  targetName: z.string().max(200).optional().nullable(),
  pageUrl: optionalUrl,
  reason: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  reporterName: z.string().max(200).optional().nullable(),
  reporterContact: z.string().max(500).optional().nullable(),
  reporterUserId: z.string().optional().nullable(),
  turnstileToken: z.string().optional(),
  anonymousId: z.string().optional().nullable(),
  device_fingerprint: z.string().optional().nullable(),
  ip_address: z.string().optional().nullable(),
  browser: z.string().optional().nullable(),
  os: z.string().optional().nullable(),
  device_type: z.string().optional().nullable(),
  screen_resolution: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
});

const appExtensionCommon = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  author: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  platforms: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  repo_url: optionalUrl,
  website_url: optionalUrl,
  source_url: optionalUrl,
  download_url: optionalUrl,
  icon_url: optionalUrl,
  social_urls: z.array(optionalUrl).optional().nullable(),
  discord_url: optionalUrl,
});

const guideCommon = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().max(5000).optional().nullable(),
  content: z.string().min(1),
  author: z.string().max(200).optional().nullable(),
});

export const submitContentSchema = z.object({
  submissionType: z.enum(["app", "extension", "guide"]),
  submitterEmail: z.string().email().max(500).optional().nullable(),
  submitterName: z.string().max(200).optional().nullable(),
  submitterContact: z.string().max(500).optional().nullable(),
  submitterNotes: z.string().max(2000).optional().nullable(),
  turnstileToken: z.string().optional(),
  submittedData: z.record(z.any()),
}).refine((data: any) => {
  if (data.submissionType === 'guide') {
    return guideCommon.safeParse(data.submittedData).success;
  }
  const parsed = appExtensionCommon.safeParse(data.submittedData);
  return parsed.success;
}, { message: "Invalid submission data format" });

export const editSuggestionSchema = z.object({
  targetType: z.enum(["app", "extension", "guide"]),
  targetId: z.string().min(1).max(100),
  originalDataSnapshot: z.record(z.any()),
  submittedData: z.record(z.any()),
  submitterName: z.string().max(200).optional().nullable(),
  submitterContact: z.string().max(500).optional().nullable(),
  submitterNotes: z.string().max(2000).optional().nullable(),
  submitterUserId: z.string().optional().nullable(),
  turnstileToken: z.string().optional()
}).refine((data: any) => {
  if (data.targetType === 'guide') {
    return guideCommon.safeParse(data.submittedData).success;
  }
  const parsed = appExtensionCommon.safeParse(data.submittedData);
  return parsed.success;
}, { message: "Invalid edited data format" });
