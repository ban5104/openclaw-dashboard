import { NextResponse } from "next/server";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { generateImageCandidatesForItem, getImageCandidatesForItem } from "@/lib/creative-assets";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ candidates: [], dataSource: "mock" });
  }

  const { id } = await params;
  const candidates = await getImageCandidatesForItem(id);
  return NextResponse.json({ candidates, dataSource: "database" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const candidates = await generateImageCandidatesForItem(id);
    return NextResponse.json({
      candidates,
      matchingMode: process.env.GEMINI_API_KEY && process.env.GEMINI_EMBEDDING_MODEL ? "gemini" : "lexical_fallback",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image candidate generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
