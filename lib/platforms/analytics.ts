import type { Platform } from "@prisma/client";
import type { AnalyticsSnapshotInput } from "@/lib/platforms/types";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function collectAnalyticsSnapshot(platform: Platform, platformPostId: string): Promise<AnalyticsSnapshotInput> {
  if (platform === "linkedin") {
    getRequiredEnv("LINKEDIN_ACCESS_TOKEN");

    const response = await fetch(`https://api.linkedin.com/rest/posts/${platformPostId}`, {
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        "LinkedIn-Version": "202503",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    const rawData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(`LinkedIn analytics fetch failed: ${response.status}`);
    }

    return {
      impressions: numberOrNull(rawData.impressionCount),
      clicks: numberOrNull(rawData.clickCount),
      likes: numberOrNull(rawData.likeCount),
      comments: numberOrNull(rawData.commentCount),
      shares: numberOrNull(rawData.shareCount),
      reach: numberOrNull(rawData.uniqueImpressionsCount) ?? numberOrNull(rawData.impressionCount),
      rawData,
    };
  }

  if (platform === "facebook") {
    const accessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
    const fields = "post_impressions,post_reactions_by_type_total,post_clicks,post_engaged_users";
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${platformPostId}/insights?metric=${fields}&access_token=${accessToken}`,
    );

    const rawData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || rawData.error) {
      throw new Error(`Facebook analytics fetch failed: ${response.status}`);
    }

    const values = Array.isArray(rawData.data) ? rawData.data : [];
    const readMetric = (name: string) => {
      const metric = values.find(
        (entry): entry is { name?: string; values?: Array<{ value?: number | Record<string, number> }> } =>
          typeof entry === "object" && entry !== null && "name" in entry && entry.name === name,
      );
      const value = metric?.values?.[0]?.value;
      return typeof value === "number" ? value : null;
    };

    return {
      impressions: readMetric("post_impressions"),
      clicks: readMetric("post_clicks"),
      reach: readMetric("post_impressions"),
      rawData,
    };
  }

  throw new Error(`Unsupported analytics platform: ${platform}`);
}

function numberOrNull(value: unknown) {
  return typeof value === "number" ? value : null;
}
