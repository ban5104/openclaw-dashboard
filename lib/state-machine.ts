import type { ContentItem, ContentState, PipelineColumn, Platform } from "@/types/content";

export const STATE_ORDER: ContentState[] = [
  "planned",
  "briefed",
  "drafting",
  "draft_ready",
  "in_review",
  "revision_required",
  "approved",
  "ready_to_post",
  "posted",
  "analyzed",
  "archived",
];

export const PIPELINE_STATE_ORDER: ContentState[] = [
  "planned",
  "briefed",
  "drafting",
  "draft_ready",
  "in_review",
  "revision_required",
  "approved",
  "ready_to_post",
  "posted",
];

export const STATE_LABELS: Record<ContentState, string> = {
  planned: "Planned",
  briefed: "Briefed",
  drafting: "Drafting",
  draft_ready: "Draft Ready",
  in_review: "In Review",
  revision_required: "Revision Required",
  approved: "Approved",
  ready_to_post: "Ready To Post",
  posted: "Posted",
  analyzed: "Analyzed",
  archived: "Archived",
};

export const STATE_COLORS: Record<ContentState, string> = {
  planned: "#4d7ba8",
  briefed: "#5f8ab5",
  drafting: "#b8842a",
  draft_ready: "#c7903f",
  in_review: "#bf6a1b",
  revision_required: "#a83f35",
  approved: "#2f6f56",
  ready_to_post: "#1f7a6b",
  posted: "#5c676d",
  analyzed: "#4c5c5f",
  archived: "#88979b",
};

export const VALID_STATE_TRANSITIONS: Record<ContentState, ContentState[]> = {
  planned: ["briefed", "archived"],
  briefed: ["drafting", "archived"],
  drafting: ["draft_ready", "archived"],
  draft_ready: ["in_review", "archived"],
  in_review: ["approved", "revision_required", "archived"],
  revision_required: ["drafting", "archived"],
  approved: ["ready_to_post", "archived"],
  ready_to_post: ["posted", "archived"],
  posted: ["analyzed", "archived"],
  analyzed: ["archived"],
  archived: [],
};

export function canTransition(from: ContentState, to: ContentState) {
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function buildPipelineColumns(items: ContentItem[], platform: "all" | Platform = "all"): PipelineColumn[] {
  return PIPELINE_STATE_ORDER.map((state) => ({
    state,
    label: STATE_LABELS[state],
    items: items.filter(
      (item) => item.state === state && (platform === "all" || item.platform === platform),
    ),
  }));
}
