import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { collectAnalyticsSnapshot } from "@/lib/platforms/analytics";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const item = await prisma.contentItem.findUnique({
    where: { id: body.contentItemId },
  });

  if (!item) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  const platformPostId = body.platformPostId ?? item.platformPostId ?? item.platformDraftId;
  if (!platformPostId) {
    return NextResponse.json({ error: "No platform identifier available for analytics collection." }, { status: 400 });
  }

  try {
    const snapshot = await collectAnalyticsSnapshot(item.platform, platformPostId);
    const snapshotDate = body.snapshotDate ? new Date(body.snapshotDate) : new Date();
    const snapshotKey = new Date(snapshotDate);
    snapshotKey.setHours(0, 0, 0, 0);

    const created = await prisma.analyticsSnapshot.upsert({
      where: {
        contentItemId_snapshotDate: {
          contentItemId: item.id,
          snapshotDate: snapshotKey,
        },
      },
      create: {
        contentItemId: item.id,
        businessId: item.businessId,
        platform: item.platform,
        snapshotDate: snapshotKey,
        impressions: snapshot.impressions ?? null,
        clicks: snapshot.clicks ?? null,
        likes: snapshot.likes ?? null,
        comments: snapshot.comments ?? null,
        shares: snapshot.shares ?? null,
        saves: snapshot.saves ?? null,
        engagementRate: snapshot.engagementRate ?? null,
        reach: snapshot.reach ?? null,
        rawData: snapshot.rawData ? (snapshot.rawData as Prisma.InputJsonValue) : Prisma.JsonNull,
        insights: snapshot.insights ?? null,
      },
      update: {
        impressions: snapshot.impressions ?? null,
        clicks: snapshot.clicks ?? null,
        likes: snapshot.likes ?? null,
        comments: snapshot.comments ?? null,
        shares: snapshot.shares ?? null,
        saves: snapshot.saves ?? null,
        engagementRate: snapshot.engagementRate ?? null,
        reach: snapshot.reach ?? null,
        rawData: snapshot.rawData ? (snapshot.rawData as Prisma.InputJsonValue) : Prisma.JsonNull,
        insights: snapshot.insights ?? null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        businessId: item.businessId,
        contentItemId: item.id,
        actor: "analytics-service",
        action: "analytics_collected",
        details: {
          platformId: platformPostId,
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics collection failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
