import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Platform } from "@/types/content";

export type FeedbackCategory =
  | "operational_request"
  | "content_feedback"
  | "process_feedback"
  | "strategic_guidance";

export type FeedbackTargetFile =
  | "writer-notes.md"
  | "reviewer-notes.md"
  | "process-notes.md"
  | "strategy-notes.md";

export interface TelegramFeedbackInput {
  text: string;
  businessSlug?: string;
  timestamp?: Date;
  workspaceDir?: string;
  actor?: string;
  chatTitle?: string | null;
}

export interface TelegramFeedbackResult {
  businessSlug: string;
  category: FeedbackCategory;
  targetFile: FeedbackTargetFile;
  platform: Platform | null;
  memoryLogPath: string;
  memoryPath: string;
  businessNotePath: string;
}

const DEFAULT_BUSINESS_SLUG = process.env.OPENCLAW_DEFAULT_BUSINESS_SLUG || "nelsonai";

function getCurrentWorkspaceDir() {
  return process.env.OPENCLAW_MARKETING_OPS_WORKSPACE_DIR
    ? path.resolve(process.env.OPENCLAW_MARKETING_OPS_WORKSPACE_DIR)
    : path.join(process.cwd(), "openclaw", "workspaces", "marketing-ops");
}

async function appendMarkdownEntry(filePath: string, heading: string, entry: string) {
  await mkdir(path.dirname(filePath), { recursive: true });

  let existing = "";
  try {
    existing = await readFile(filePath, "utf8");
  } catch {
    existing = "";
  }

  const normalized = existing.trimEnd();
  const prefix = normalized.length === 0 ? "" : `${normalized}\n\n`;
  await writeFile(filePath, `${prefix}${heading}\n${entry}\n`, "utf8");
}

function formatDateParts(timestamp: Date) {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, "0");
  const day = String(timestamp.getDate()).padStart(2, "0");
  const hours = String(timestamp.getHours()).padStart(2, "0");
  const minutes = String(timestamp.getMinutes()).padStart(2, "0");

  return {
    dayStamp: `${year}-${month}-${day}`,
    timeStamp: `${hours}:${minutes}`,
  };
}

function inferPlatform(text: string): Platform | null {
  const normalized = text.toLowerCase();
  if (normalized.includes("linkedin")) {
    return "linkedin";
  }
  if (normalized.includes("facebook")) {
    return "facebook";
  }
  return null;
}

export function classifyTelegramFeedback(text: string): {
  category: FeedbackCategory;
  targetFile: FeedbackTargetFile;
  platform: Platform | null;
} {
  const normalized = text.toLowerCase();
  const platform = inferPlatform(text);

  if (/(review|reviewer|fact|claim|compliance|verify|accuracy|risk flag)/.test(normalized)) {
    return {
      category: "content_feedback",
      targetFile: "reviewer-notes.md",
      platform,
    };
  }

  if (/(tone|voice|hook|cta|caption|image|visual|draft|post|copy|linkedin|facebook)/.test(normalized)) {
    return {
      category: "content_feedback",
      targetFile: "writer-notes.md",
      platform,
    };
  }

  if (/(batch|schedule|scheduled|notification|notify|alert|approval|workflow|process|cadence|frequency)/.test(normalized)) {
    return {
      category: "process_feedback",
      targetFile: "process-notes.md",
      platform,
    };
  }

  if (/(audience|market|positioning|strategy|priority|offer|business|segment)/.test(normalized)) {
    return {
      category: "strategic_guidance",
      targetFile: "strategy-notes.md",
      platform,
    };
  }

  return {
    category: "operational_request",
    targetFile: "process-notes.md",
    platform,
  };
}

export async function persistTelegramFeedback({
  text,
  businessSlug = DEFAULT_BUSINESS_SLUG,
  timestamp = new Date(),
  workspaceDir = getCurrentWorkspaceDir(),
  actor = "Ben",
  chatTitle,
}: TelegramFeedbackInput): Promise<TelegramFeedbackResult> {
  const { category, targetFile, platform } = classifyTelegramFeedback(text);
  const { dayStamp, timeStamp } = formatDateParts(timestamp);
  const memoryLogPath = path.join(workspaceDir, "memory", `${dayStamp}.md`);
  const memoryPath = path.join(workspaceDir, "memory", "memory.md");
  const businessNotePath = path.join(workspaceDir, "businesses", businessSlug, targetFile);
  const scope = platform ? `${platform} ` : "";
  const sourceLine = chatTitle ? `Source: Telegram chat "${chatTitle}"` : "Source: Telegram";

  await appendMarkdownEntry(
    memoryLogPath,
    `## ${timeStamp} Telegram feedback`,
    [
      `- Actor: ${actor}`,
      `- Business: ${businessSlug}`,
      `- Category: ${category}`,
      platform ? `- Platform: ${platform}` : null,
      `- Target file: ${targetFile}`,
      `- Note: ${text.trim()}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  await appendMarkdownEntry(
    memoryPath,
    "## Durable working agreements",
    [
      `- ${dayStamp} ${timeStamp} | ${businessSlug} | ${category} | ${scope}${text.trim()}`,
    ].join("\n"),
  );

  await appendMarkdownEntry(
    businessNotePath,
    `## ${dayStamp}`,
    `- ${timeStamp} (${category}) ${sourceLine}. ${text.trim()}`,
  );

  return {
    businessSlug,
    category,
    targetFile,
    platform,
    memoryLogPath,
    memoryPath,
    businessNotePath,
  };
}
