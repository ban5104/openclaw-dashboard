export interface DraftPublishResult {
  platformId: string | null;
  platformUrl: string | null;
  apiResponse: Record<string, unknown>;
}

export interface AnalyticsSnapshotInput {
  impressions?: number | null;
  clicks?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  reach?: number | null;
  engagementRate?: number | null;
  rawData?: Record<string, unknown> | null;
  insights?: string | null;
}
