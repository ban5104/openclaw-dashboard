export interface LinkedInDraftInput {
  headline: string;
  body: string;
  organizationId: string;
}

export function buildLinkedInDraftPayload(input: LinkedInDraftInput) {
  return {
    author: `urn:li:organization:${input.organizationId}`,
    commentary: input.body,
    visibility: "PUBLIC",
    lifecycleState: "DRAFT",
    isReshareDisabledByAuthor: false,
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    contentCallToActionLabel: "LEARN_MORE",
    title: input.headline,
  };
}

export function hasLinkedInConfig() {
  return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_ORG_ID);
}
