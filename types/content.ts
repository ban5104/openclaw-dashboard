export type Platform = "linkedin" | "facebook" | "x" | "blog";

export type ContentState =
  | "planned"
  | "briefed"
  | "drafting"
  | "draft_ready"
  | "in_review"
  | "revision_required"
  | "approved"
  | "ready_to_post"
  | "posted"
  | "analyzed"
  | "archived";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status?: "active" | "paused" | "archived";
  audience: string;
  tone: string;
  positioning: string;
  complianceRules: string[];
  contentPillars: string[];
  enabledPlatforms?: Platform[];
  postingCadence?: Record<string, { posts_per_week: number }>;
  analyticsCadence?: "daily" | "weekly" | "biweekly";
  brandProfilePath?: string | null;
}

export interface ReviewRecord {
  id?: string;
  verdict: "PASS" | "REVISE" | "REJECT";
  confidence: "high" | "medium" | "low";
  brandFit?: boolean;
  claimSafety?: boolean;
  platformFit?: boolean;
  clarityScore?: number | null;
  riskFlags?: string[];
  note?: string;
  reviewer: string;
  createdAt: string;
}

export interface ImageCandidate {
  id: string;
  title: string;
  assetUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  tags: string[];
  rank: number;
  score: number;
  rationale?: string;
  selected?: boolean;
}

export interface VersionRecord {
  id: string;
  label: string;
  versionNumber?: number;
  headline?: string;
  body: string;
  wordCount: number;
  hook: string;
  cta: string;
  imagePrompt?: string;
  imageUrl?: string;
  visualNotes?: string;
  altHooks?: string[];
  imageCandidates?: ImageCandidate[];
  excerpt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  detail: string;
}

export interface ContentItem {
  id: string;
  businessId?: string;
  businessSlug?: string;
  businessName?: string;
  title: string;
  platform: Platform;
  scheduledDate: string | null;
  suggestedTime: string | null;
  campaignTheme: string;
  topic: string;
  state: ContentState;
  priority: Priority;
  brief: string;
  hook: string;
  cta: string;
  boostCandidate?: boolean;
  boostReason?: string;
  reviewerNote?: string;
  currentVersion: VersionRecord;
  selectedAsset?: ImageCandidate;
  review: ReviewRecord;
  versions?: VersionRecord[];
  reviews?: ReviewRecord[];
  audit: AuditEvent[];
  revisionCount?: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agent: string;
  kind: "spawn" | "heartbeat" | "draft" | "review" | "complete" | "alert";
  summary: string;
  detail: string;
  business: string;
  platform?: Platform;
}

export interface AnalyticsMetric {
  label: string;
  value: string;
  delta: string;
}

export interface AnalyticsSnapshotSummary {
  id: string;
  headline: string;
  platform: Platform;
  snapshotDate: string;
  engagementRate?: number | null;
  reach?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  insights?: string | null;
  boostCandidate?: boolean;
}

export interface CalendarEntry {
  day: string;
  date: string;
  items: Array<Pick<ContentItem, "id" | "title" | "platform" | "state" | "suggestedTime">>;
}

export interface SettingsCheck {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}

export interface QueueGroup {
  platform: Platform;
  label: string;
  items: ContentItem[];
}

export interface QueueSummary {
  totalReady: number;
  linkedInReady: number;
  facebookReady: number;
  suggestedRange: string;
}

export interface PipelineColumn {
  state: ContentState;
  label: string;
  items: ContentItem[];
}

export interface AgentOverview {
  id: string;
  name: string;
  role: string;
  model: string;
  type: "persistent" | "sub-agent";
  responsibilities: string[];
  workspaceLinks: Array<{
    label: string;
    path: string;
  }>;
}
