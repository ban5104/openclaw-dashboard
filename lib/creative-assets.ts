import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { ImageCandidate } from "@/types/content";

const MAX_IMAGE_CANDIDATES = 3;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

type AssetRecord = {
  title: string;
  caption: string | null;
  tags: string[];
};

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  const model = process.env.GEMINI_EMBEDDING_MODEL;

  if (!apiKey || !model) {
    return null;
  }

  return { apiKey, model };
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

export function buildCreativeAssetDocument(asset: Pick<AssetRecord, "title" | "caption" | "tags">) {
  return [asset.title, asset.caption, asset.tags.join(" ")].filter(Boolean).join("\n");
}

export function lexicalSimilarity(query: string, document: string) {
  const queryTokens = new Set(tokenize(query));
  const documentTokens = new Set(tokenize(document));

  if (!queryTokens.size || !documentTokens.size) {
    return 0;
  }

  let overlap = 0;
  queryTokens.forEach((token) => {
    if (documentTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / queryTokens.size;
}

function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function parseEmbedding(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return null;
  }

  const numbers = value.filter((entry): entry is number => typeof entry === "number");
  return numbers.length === value.length ? numbers : null;
}

async function embedTexts(
  requests: Array<{ text: string; taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"; title?: string }>,
) {
  const config = getGeminiConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(
    `${GEMINI_API_URL}/models/${config.model}:batchEmbedContents?key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: requests.map((request) => ({
          model: `models/${config.model}`,
          taskType: request.taskType,
          title: request.title,
          outputDimensionality: 768,
          content: {
            parts: [{ text: request.text }],
          },
        })),
      }),
    },
  );

  const json = (await response.json().catch(() => ({}))) as {
    embeddings?: Array<{ values?: number[] }>;
    error?: { message?: string };
  };

  if (!response.ok || !json.embeddings) {
    throw new Error(json.error?.message ?? `Gemini embedding request failed: ${response.status}`);
  }

  return json.embeddings.map((embedding) => embedding.values ?? []);
}

function buildQueryFromItem(params: {
  title: string;
  visualNotes?: string | null;
  brief?: Prisma.JsonValue | null;
  platform: string;
  campaignTheme?: string | null;
  audience?: string | null;
  positioning?: string | null;
}) {
  const brief =
    params.brief && typeof params.brief === "object" && !Array.isArray(params.brief)
      ? (params.brief as Record<string, Prisma.JsonValue>)
      : {};

  return [
    params.title,
    params.visualNotes,
    typeof brief.topic === "string" ? brief.topic : null,
    typeof brief.key_message === "string" ? brief.key_message : null,
    typeof brief.target_audience === "string" ? brief.target_audience : null,
    params.campaignTheme,
    params.platform,
    params.audience,
    params.positioning,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n");
}

export async function getImageCandidatesForItem(itemId: string): Promise<ImageCandidate[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const matches = await prisma.contentAssetMatch.findMany({
    where: { contentItemId: itemId },
    include: { asset: true },
    orderBy: [{ selected: "desc" }, { rank: "asc" }],
  });

  return matches.map((match) => ({
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
}

export async function generateImageCandidatesForItem(itemId: string) {
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    include: {
      business: {
        include: {
          brandProfiles: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          creativeAssets: {
            where: { status: "active" },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      currentVersion: true,
      assetMatches: {
        where: {
          selected: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!item) {
    throw new Error("Content item not found.");
  }

  if (!item.currentVersion) {
    throw new Error("Current draft version is missing.");
  }

  const profile =
    item.business.brandProfiles[0]?.profile &&
    typeof item.business.brandProfiles[0].profile === "object" &&
    !Array.isArray(item.business.brandProfiles[0].profile)
      ? (item.business.brandProfiles[0].profile as Record<string, Prisma.JsonValue>)
      : {};

  const queryText = buildQueryFromItem({
    title: item.currentVersion.headline ?? item.campaignTheme ?? `${item.platform} post`,
    visualNotes: item.currentVersion.visualNotes,
    brief: item.brief,
    platform: item.platform,
    campaignTheme: item.campaignTheme,
    audience: typeof profile.audience === "string" ? profile.audience : null,
    positioning: typeof profile.positioning === "string" ? profile.positioning : null,
  });

  const assets = item.business.creativeAssets;
  if (!assets.length) {
    await prisma.contentAssetMatch.deleteMany({
      where: { contentVersionId: item.currentVersion.id },
    });
    return [];
  }

  const geminiEnabled = Boolean(getGeminiConfig());
  let queryEmbedding: number[] | null = null;

  if (geminiEnabled) {
    const assetsMissingEmbeddings = assets.filter((asset) => !parseEmbedding(asset.embedding));

    if (assetsMissingEmbeddings.length) {
      const generated = await embedTexts(
        assetsMissingEmbeddings.map((asset) => ({
          text: buildCreativeAssetDocument(asset),
          title: asset.title,
          taskType: "RETRIEVAL_DOCUMENT",
        })),
      );

      if (generated) {
        await Promise.all(
          assetsMissingEmbeddings.map((asset, index) =>
            prisma.creativeAsset.update({
              where: { id: asset.id },
              data: {
                embeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
                embedding: generated[index] as Prisma.InputJsonValue,
                embeddingGeneratedAt: new Date(),
              },
            }),
          ),
        );
      }
    }

    const embeddedQuery = await embedTexts([
      {
        text: queryText,
        taskType: "RETRIEVAL_QUERY",
      },
    ]);
    queryEmbedding = embeddedQuery?.[0] ?? null;
  }

  const scored = assets
    .map((asset) => {
      const document = buildCreativeAssetDocument(asset);
      const assetEmbedding = parseEmbedding(asset.embedding);
      const score =
        queryEmbedding && assetEmbedding
          ? cosineSimilarity(queryEmbedding, assetEmbedding)
          : lexicalSimilarity(queryText, document);

      return {
        asset,
        score,
        rationale:
          item.currentVersion?.visualNotes
            ? `Matched against visual notes: ${item.currentVersion.visualNotes}`
            : "Matched against post theme and brand context.",
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_IMAGE_CANDIDATES);

  const selectedAssetId = item.assetMatches[0]?.assetId ?? null;

  await prisma.contentAssetMatch.deleteMany({
    where: { contentVersionId: item.currentVersion.id },
  });

  if (scored.length) {
    await prisma.contentAssetMatch.createMany({
      data: scored.map((entry, index) => ({
        contentItemId: item.id,
        contentVersionId: item.currentVersion!.id,
        assetId: entry.asset.id,
        rank: index + 1,
        similarityScore: entry.score,
        rationale: entry.rationale,
        selected: selectedAssetId === entry.asset.id,
      })),
    });
  }

  await prisma.auditEvent.create({
    data: {
      businessId: item.businessId,
      contentItemId: item.id,
      actor: "image-matcher",
      action: "image_candidates_generated",
      details: {
        candidate_count: scored.length,
        matching_mode: geminiEnabled ? "gemini" : "lexical_fallback",
      },
    },
  });

  return getImageCandidatesForItem(item.id);
}
