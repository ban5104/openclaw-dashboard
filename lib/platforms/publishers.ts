import type { ContentItem } from "@prisma/client";
import { buildFacebookDraftPayload, hasFacebookConfig } from "@/lib/platforms/facebook";
import { buildLinkedInDraftPayload, hasLinkedInConfig } from "@/lib/platforms/linkedin";
import type { DraftPublishResult } from "@/lib/platforms/types";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveHeadline(item: ContentItem, body: string) {
  if (item.campaignTheme?.trim()) {
    return item.campaignTheme;
  }
  return body.split("\n")[0]?.slice(0, 120) || "Marketing draft";
}

export async function publishDraftToPlatform(item: ContentItem, body: string): Promise<DraftPublishResult> {
  if (item.platform === "linkedin") {
    if (!hasLinkedInConfig()) {
      throw new Error("LinkedIn publisher is not configured.");
    }

    const payload = buildLinkedInDraftPayload({
      headline: resolveHeadline(item, body),
      body,
      organizationId: getRequiredEnv("LINKEDIN_ORG_ID"),
    });

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getRequiredEnv("LINKEDIN_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202503",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    const apiResponse = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(`LinkedIn draft creation failed: ${response.status}`);
    }

    return {
      platformId: typeof apiResponse.id === "string" ? apiResponse.id : null,
      platformUrl: typeof apiResponse.url === "string" ? apiResponse.url : null,
      apiResponse,
    };
  }

  if (item.platform === "facebook") {
    if (!hasFacebookConfig()) {
      throw new Error("Facebook publisher is not configured.");
    }

    const pageId = getRequiredEnv("FACEBOOK_PAGE_ID");
    const payload = buildFacebookDraftPayload({
      body,
      pageId,
    });

    const response = await fetch(`https://graph.facebook.com/v23.0/${pageId}/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        access_token: getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN"),
      }),
    });

    const apiResponse = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok || apiResponse.error) {
      throw new Error(`Facebook draft creation failed: ${response.status}`);
    }

    const platformId = typeof apiResponse.id === "string" ? apiResponse.id : null;

    return {
      platformId,
      platformUrl: platformId ? `https://www.facebook.com/${platformId}` : null,
      apiResponse,
    };
  }

  throw new Error(`Unsupported publishing platform: ${item.platform}`);
}
