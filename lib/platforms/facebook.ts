export interface FacebookDraftInput {
  body: string;
  pageId: string;
}

export function buildFacebookDraftPayload(input: FacebookDraftInput) {
  return {
    page_id: input.pageId,
    message: input.body,
    published: false,
  };
}

export function hasFacebookConfig() {
  return Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID);
}
