import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import {
  activityEvents as mockActivityEvents,
  agentOverview as mockAgentOverview,
  analyticsMetrics as mockAnalyticsMetrics,
  analyticsSnapshots as mockAnalyticsSnapshots,
  business as mockBusiness,
  contentItems as mockContentItems,
  getItemById as getMockItemById,
  queueSummary as mockQueueSummary,
  settingsChecks as mockSettingsChecks,
  weeklyCalendar as mockWeeklyCalendar,
} from "@/lib/mock-data";
import { canTransition, PIPELINE_STATE_ORDER, STATE_LABELS } from "@/lib/state-machine";
import type {
  ActivityEvent,
  AgentOverview,
  AnalyticsMetric,
  AnalyticsSnapshotSummary,
  BusinessProfile,
  CalendarEntry,
  ContentItem,
  ContentState,
  ImageCandidate,
  Platform,
  QueueGroup,
  QueueSummary,
  SettingsCheck,
} from "@/types/content";

type DbContentItem = Prisma.ContentItemGetPayload<{
  include: {
    business: true;
    currentVersion: true;
    assetMatches: { include: { asset: true } };
    versions: true;
    reviewRecords: true;
    auditEvents: true;
  };
}>;

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatShortDate(value: Date | null | undefined) {
  return value ? shortDateFormatter.format(value) : null;
}

function formatDateTime(value: Date | null | undefined) {
  return value ? shortDateTimeFormatter.format(value) : "Pending";
}

function formatTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  }

  return value;
}

function parseObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function extractString(value: Prisma.JsonValue | null | undefined, key: string) {
  const record = parseObject(value);
  const item = record[key];
  return typeof item === "string" ? item : "";
}

function fallbackText(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim() ?? "";
}

function mapBusiness(profile: Prisma.JsonValue | null | undefined, business: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: string;
  enabledPlatforms: Platform[];
  postingCadence: Prisma.JsonValue;
  analyticsCadence: "daily" | "weekly" | "biweekly";
  brandProfilePath: string | null;
}) {
  const data = parseObject(profile);
  const getString = (key: string, fallback = "") => {
    const value = data[key];
    return typeof value === "string" ? value : fallback;
  };
  const getStringArray = (key: string, fallback: string[] = []) => {
    const value = data[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
  };

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    status: business.status as BusinessProfile["status"],
    audience: getString("audience", mockBusiness.audience),
    tone: getString("tone", mockBusiness.tone),
    positioning: getString("positioning", mockBusiness.positioning),
    complianceRules: getStringArray("complianceRules", mockBusiness.complianceRules),
    contentPillars: getStringArray("contentPillars", mockBusiness.contentPillars),
    enabledPlatforms: business.enabledPlatforms,
    postingCadence: parseObject(business.postingCadence) as BusinessProfile["postingCadence"],
    analyticsCadence: business.analyticsCadence,
    brandProfilePath: business.brandProfilePath,
  } satisfies BusinessProfile;
}

function mapVersion(version: {
  id: string;
  versionNumber: number;
  body: string;
  headline: string | null;
  imagePrompt?: string | null;
  imageUrl?: string | null;
  visualNotes: string | null;
  altHooks: string[];
  metadata: Prisma.JsonValue;
}, imageCandidates: ImageCandidate[] = []) {
  const metadata = parseObject(version.metadata);
  const wordCount =
    typeof metadata.word_count === "number"
      ? metadata.word_count
      : version.body.split(/\s+/).filter(Boolean).length;

  return {
    id: version.id,
    label: `Version ${version.versionNumber}`,
    versionNumber: version.versionNumber,
    headline: version.headline ?? undefined,
    body: version.body,
    wordCount,
    hook: fallbackText(version.headline, version.body.slice(0, 110)),
    cta: typeof metadata.cta === "string" ? metadata.cta : "See brief",
    imagePrompt: version.imagePrompt ?? undefined,
    imageUrl: version.imageUrl ?? undefined,
    visualNotes: version.visualNotes ?? undefined,
    altHooks: version.altHooks,
    imageCandidates,
    excerpt: version.body.slice(0, 220),
  };
}

function mapReview(review: DbContentItem["reviewRecords"][number]) {
  return {
    id: review.id,
    verdict: review.outcome === "pass" ? "PASS" : review.outcome === "reject" ? "REJECT" : "REVISE",
    confidence: review.confidence ?? "low",
    brandFit: review.brandFit ?? undefined,
    claimSafety: review.claimSafety ?? undefined,
    platformFit: review.platformFit ?? undefined,
    clarityScore: review.clarityScore,
    riskFlags: review.riskFlags,
    note: review.revisionNotes ?? undefined,
    reviewer: review.reviewerAgent,
    createdAt: formatDateTime(review.createdAt),
  } as const;
}

function mapContentItem(item: DbContentItem, businessSlug?: string): ContentItem {
  const briefTopic = extractString(item.brief, "topic");
  const briefMessage = extractString(item.brief, "key_message");
  const briefAudience = extractString(item.brief, "target_audience");
  const cta = extractString(item.brief, "cta") || "No CTA set";
  const imageCandidates: ImageCandidate[] = item.assetMatches.map((match) => ({
    id: match.asset.id,
    title: match.asset.title,
    assetUrl: match.asset.assetUrl,
    thumbnailUrl: match.asset.thumbnailUrl ?? undefined,
    caption: match.asset.caption ?? undefined,
    tags: match.asset.tags,
    rank: match.rank,
    score: Number(match.similarityScore.toFixed(3)),
    rationale: match.rationale ?? undefined,
    selected: match.selected,
  }));

  const currentVersion = item.currentVersion
    ? mapVersion(item.currentVersion as typeof item.currentVersion & {
      imagePrompt?: string | null;
      imageUrl?: string | null;
    }, imageCandidates)
    : {
        id: `brief-${item.id}`,
        label: "Brief only",
        headline: undefined,
        body: "",
        wordCount: 0,
        hook: fallbackText(briefTopic, item.campaignTheme),
        cta,
        imagePrompt: undefined,
        imageUrl: undefined,
        visualNotes: undefined,
        altHooks: [],
        imageCandidates,
        excerpt: "Awaiting first draft generation.",
      };

  const latestReview = item.reviewRecords[0];
  const review = latestReview
    ? mapReview(latestReview)
    : {
        verdict: "REVISE" as const,
        confidence: "low" as const,
        reviewer: "Reviewer",
        createdAt: "Pending",
      };

  return {
    id: item.id,
    businessId: item.businessId,
    businessSlug,
    businessName: item.business.name,
    title: fallbackText(currentVersion.headline, briefTopic, item.campaignTheme, `${item.platform} content`),
    platform: item.platform,
    scheduledDate: formatShortDate(item.scheduledDate),
    suggestedTime: formatTime(item.suggestedTime as unknown as Date | null | undefined),
    campaignTheme: item.campaignTheme ?? "General",
    topic: fallbackText(briefTopic, briefAudience, "Unspecified"),
    state: item.state as ContentState,
    priority: item.priority,
    brief: fallbackText(briefMessage, briefTopic, "No brief captured yet."),
    hook: currentVersion.hook,
    cta,
    boostCandidate: item.boostCandidate ?? false,
    boostReason: item.boostReason ?? undefined,
    reviewerNote: latestReview?.revisionNotes ?? undefined,
    currentVersion,
    selectedAsset: imageCandidates.find((candidate) => candidate.selected),
    review,
    versions: item.versions.map((version) => mapVersion(version as typeof version & {
      imagePrompt?: string | null;
      imageUrl?: string | null;
    })),
    reviews: item.reviewRecords.map(mapReview),
    audit: item.auditEvents.map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      timestamp: formatDateTime(event.createdAt),
      detail:
        event.details && typeof event.details === "object" && !Array.isArray(event.details)
          ? JSON.stringify(event.details)
          : "No extra detail recorded.",
    })),
    revisionCount: item.auditEvents.filter((event) => event.toState === "revision_required").length,
  };
}

async function safeDb<T>(query: () => Promise<T>, fallback: T): Promise<{ data: T; dataSource: "database" | "mock" }> {
  if (!isDatabaseConfigured()) {
    return { data: fallback, dataSource: "mock" };
  }

  try {
    return { data: await query(), dataSource: "database" };
  } catch {
    return { data: fallback, dataSource: "mock" };
  }
}

export async function getBusinesses() {
  return safeDb(async () => {
    const businesses = await prisma.business.findMany({
      where: { status: "active" },
      include: {
        brandProfiles: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return businesses.map((business) =>
      mapBusiness(business.brandProfiles[0]?.profile, {
        id: business.id,
        name: business.name,
        slug: business.slug,
        timezone: business.timezone,
        status: business.status,
        enabledPlatforms: business.enabledPlatforms as Platform[],
        postingCadence: business.postingCadence,
        analyticsCadence: business.analyticsCadence,
        brandProfilePath: business.brandProfilePath,
      }),
    );
  }, [mockBusiness]);
}

export async function getBusiness(slug = "nelsonai") {
  const result = await getBusinesses();
  const business = result.data.find((entry) => entry.slug === slug) ?? result.data[0] ?? mockBusiness;
  return { business, dataSource: result.dataSource };
}

export async function getContentItems(slug = "nelsonai") {
  return safeDb(async () => {
    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        contentItems: {
          include: {
            business: true,
            currentVersion: true,
            assetMatches: {
              include: { asset: true },
              orderBy: [{ selected: "desc" }, { rank: "asc" }],
            },
            versions: {
              orderBy: { versionNumber: "desc" },
            },
            reviewRecords: {
              orderBy: { createdAt: "desc" },
            },
            auditEvents: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
          orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!business) {
      return [];
    }

    return business.contentItems.map((item) => mapContentItem(item, business.slug));
  }, mockContentItems);
}

export async function getQueueData(slug = "nelsonai") {
  const [{ business, dataSource: businessSource }, itemsResult] = await Promise.all([
    getBusiness(slug),
    getContentItems(slug),
  ]);

  const readyItems = itemsResult.data.filter((item) => item.state === "ready_to_post");
  const groups: QueueGroup[] = [
    { platform: "linkedin", label: "LinkedIn", items: readyItems.filter((item) => item.platform === "linkedin") },
    { platform: "facebook", label: "Facebook", items: readyItems.filter((item) => item.platform === "facebook") },
  ].filter((group): group is QueueGroup => group.items.length > 0);

  const summary: QueueSummary =
    itemsResult.dataSource === "database"
      ? {
          totalReady: readyItems.length,
          linkedInReady: groups.find((group) => group.platform === "linkedin")?.items.length ?? 0,
          facebookReady: groups.find((group) => group.platform === "facebook")?.items.length ?? 0,
          suggestedRange:
            readyItems.length > 0
              ? `${readyItems[0]?.scheduledDate ?? "Unscheduled"} to ${readyItems.at(-1)?.scheduledDate ?? "Unscheduled"}`
              : "No dates set",
        }
      : mockQueueSummary;

  return {
    business,
    groups,
    summary,
    dataSource: businessSource === "database" && itemsResult.dataSource === "database" ? "database" : "mock",
  } as const;
}

export async function getContentItemById(id: string) {
  return safeDb(async () => {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        business: true,
        currentVersion: true,
        assetMatches: {
          include: { asset: true },
          orderBy: [{ selected: "desc" }, { rank: "asc" }],
        },
        versions: { orderBy: { versionNumber: "desc" } },
        reviewRecords: { orderBy: { createdAt: "desc" } },
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return item ? mapContentItem(item, item.business.slug) : null;
  }, getMockItemById(id) ?? null);
}

export async function getActivityEvents(slug = "nelsonai") {
  return safeDb(async () => {
    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!business) {
      return [];
    }

    return business.auditEvents.map((event): ActivityEvent => {
      const kind =
        event.action.includes("heartbeat")
          ? "heartbeat"
          : event.action.includes("review")
            ? "review"
            : event.action.includes("draft")
              ? "draft"
              : event.action.includes("spawn")
                ? "spawn"
                : event.action.includes("alert") || event.action.includes("notification")
                  ? "alert"
                  : "complete";

      return {
        id: event.id,
        timestamp: formatDateTime(event.createdAt),
        agent: event.actor,
        kind,
        summary: event.action,
        detail:
          event.details && typeof event.details === "object" && !Array.isArray(event.details)
            ? JSON.stringify(event.details)
            : "No extra detail recorded.",
        business: business.name,
      };
    });
  }, mockActivityEvents);
}

export async function getAnalyticsMetrics(slug = "nelsonai") {
  return safeDb(async () => {
    const business = await prisma.business.findUnique({ where: { slug } });

    if (!business) {
      return [];
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [snapshots, readyCount, reviews] = await Promise.all([
      prisma.analyticsSnapshot.findMany({
        where: {
          businessId: business.id,
          snapshotDate: { gte: sevenDaysAgo },
        },
      }),
      prisma.contentItem.count({
        where: {
          businessId: business.id,
          state: "ready_to_post",
        },
      }),
      prisma.reviewRecord.findMany({
        where: {
          contentItem: { businessId: business.id },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const totals = snapshots.reduce(
      (acc, snapshot) => ({
        reach: acc.reach + (snapshot.reach ?? snapshot.impressions ?? 0),
        impressions: acc.impressions + (snapshot.impressions ?? 0),
        clicks: acc.clicks + (snapshot.clicks ?? 0),
        engagement: acc.engagement + Number(snapshot.engagementRate ?? 0),
      }),
      { reach: 0, impressions: 0, clicks: 0, engagement: 0 },
    );

    const avgEngagement = snapshots.length ? (totals.engagement / snapshots.length) * 100 : 0;
    const passCount = reviews.filter((review) => review.outcome === "pass").length;
    const passRate = reviews.length ? (passCount / reviews.length) * 100 : 0;

    return [
      { label: "Weekly reach", value: totals.reach.toLocaleString(), delta: snapshots.length ? `${snapshots.length} snapshots` : "No snapshots" },
      { label: "Average engagement", value: `${avgEngagement.toFixed(1)}%`, delta: totals.clicks ? `${totals.clicks} clicks` : "No clicks" },
      { label: "Ready-to-post queue", value: String(readyCount), delta: readyCount ? "Batch ready" : "Queue clear" },
      { label: "Review pass rate", value: `${passRate.toFixed(0)}%`, delta: reviews.length ? `${reviews.length} reviews` : "No reviews" },
    ] satisfies AnalyticsMetric[];
  }, mockAnalyticsMetrics);
}

export async function getAnalyticsSnapshots(slug = "nelsonai") {
  return safeDb(async () => {
    const business = await prisma.business.findUnique({ where: { slug } });

    if (!business) {
      return [];
    }

    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: { businessId: business.id },
      include: {
        contentItem: {
          include: {
            currentVersion: true,
          },
        },
      },
      orderBy: { snapshotDate: "desc" },
      take: 12,
    });

    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      headline:
        snapshot.contentItem?.currentVersion?.headline ??
        snapshot.contentItem?.campaignTheme ??
        "Untitled snapshot",
      platform: snapshot.platform as Platform,
      snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
      engagementRate: snapshot.engagementRate ? Number(snapshot.engagementRate) : null,
      reach: snapshot.reach,
      impressions: snapshot.impressions,
      clicks: snapshot.clicks,
      insights: snapshot.insights,
      boostCandidate: snapshot.contentItem?.boostCandidate ?? false,
    })) satisfies AnalyticsSnapshotSummary[];
  }, mockAnalyticsSnapshots);
}

export async function getCalendarEntries(slug = "nelsonai") {
  const items = await getContentItems(slug);

  if (items.dataSource === "mock") {
    return { data: mockWeeklyCalendar, dataSource: "mock" as const };
  }

  const grouped = new Map<string, CalendarEntry>();

  for (const item of items.data) {
    if (!item.scheduledDate) {
      continue;
    }

    if (!grouped.has(item.scheduledDate)) {
      const parsed = new Date(`${item.scheduledDate}, ${new Date().getFullYear()}`);
      grouped.set(item.scheduledDate, {
        day: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parsed),
        date: item.scheduledDate,
        items: [],
      });
    }

    grouped.get(item.scheduledDate)?.items.push({
      id: item.id,
      title: item.title,
      platform: item.platform,
      state: item.state,
      suggestedTime: item.suggestedTime,
    });
  }

  return { data: Array.from(grouped.values()), dataSource: "database" as const };
}

export async function getSettingsChecks(slug = "nelsonai") {
  const business = await getBusiness(slug);
  const result = await safeDb(async () => {
    const dbState = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT now()`;

    return [
      { label: "Database", value: dbState.length ? "Connected" : "Unreachable", tone: dbState.length ? "success" : "warning" },
      {
        label: "Telegram notifier",
        value: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "Configured" : "Missing config",
        tone: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "success" : "warning",
      },
      {
        label: "LinkedIn analytics",
        value: process.env.LINKEDIN_ACCESS_TOKEN ? "Token configured" : "Missing token",
        tone: process.env.LINKEDIN_ACCESS_TOKEN ? "success" : "warning",
      },
      {
        label: "Facebook analytics",
        value: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? "Token configured" : "Missing token",
        tone: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ? "success" : "warning",
      },
      {
        label: "OpenClaw gateway",
        value: process.env.OPENCLAW_WS_URL ? "Configured" : "Using default gateway URL",
        tone: process.env.OPENCLAW_WS_URL ? "success" : "neutral",
      },
      {
        label: "Admin auth",
        value: process.env.ADMIN_SECRET ? "Protected" : "Open in dev mode",
        tone: process.env.ADMIN_SECRET ? "success" : "neutral",
      },
    ] satisfies SettingsCheck[];
  }, mockSettingsChecks);

  return { business: business.business, checks: result.data, dataSource: result.dataSource };
}

export async function getBusinessSettings(slug = "nelsonai") {
  return safeDb(async () => {
    const business = await prisma.business.findUnique({ where: { slug } });

    if (!business) {
      return {
        postingCadence: mockBusiness.postingCadence,
        analyticsCadence: mockBusiness.analyticsCadence,
        brandProfilePath: mockBusiness.brandProfilePath,
        config: {},
      };
    }

    return {
      postingCadence: business.postingCadence,
      analyticsCadence: business.analyticsCadence,
      brandProfilePath: business.brandProfilePath,
      config: business.config,
    };
  }, {
    postingCadence: mockBusiness.postingCadence,
    analyticsCadence: mockBusiness.analyticsCadence,
    brandProfilePath: mockBusiness.brandProfilePath,
    config: {},
  });
}

export async function getBrandProfile(slug = "nelsonai") {
  const business = await getBusiness(slug);
  const result = await safeDb(async () => {
    const record = await prisma.business.findUnique({
      where: { slug },
      include: {
        brandProfiles: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return record?.brandProfiles[0]?.profile ?? null;
  }, null);

  return {
    business: business.business,
    profile: result.data,
    dataSource: result.dataSource,
  };
}

export async function getAgentOverview() {
  return { data: mockAgentOverview, dataSource: "mock" as const };
}

export function getAvailableTransitions(state: ContentState) {
  return PIPELINE_STATE_ORDER.filter((candidate) => canTransition(state, candidate)).map((candidate) => ({
    value: candidate,
    label: STATE_LABELS[candidate],
  }));
}
