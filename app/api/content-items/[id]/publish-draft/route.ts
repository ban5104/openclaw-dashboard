import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isAuthorizedRequest, unauthorizedResponse } from "@/lib/auth";
import { publishDraftToPlatform } from "@/lib/platforms/publishers";

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

  const { id } = await params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      currentVersion: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!item.currentVersion) {
    return NextResponse.json({ error: "Current draft version is missing." }, { status: 400 });
  }

  try {
    if (item.state === "approved") {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          state: "publishing_draft",
        },
      });
    }

    const result = await publishDraftToPlatform(item, item.currentVersion.body);

    const updated = await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        state: "draft_on_platform",
        platformDraftId: result.platformId,
        platformDraftUrl: result.platformUrl,
        publishedDraftAt: new Date(),
      },
    });

    await prisma.platformPublication.create({
      data: {
        contentItemId: item.id,
        platform: item.platform,
        action: "draft_created",
        platformId: result.platformId,
        platformUrl: result.platformUrl,
        apiResponse: result.apiResponse as Prisma.InputJsonValue,
      },
    });

    await prisma.auditEvent.create({
      data: {
        businessId: item.businessId,
        contentItemId: item.id,
        actor: "publisher-service",
        action: "draft_created_on_platform",
        fromState: item.state === "approved" ? "publishing_draft" : item.state,
        toState: "draft_on_platform",
        details: {
          platformId: result.platformId,
          platformUrl: result.platformUrl,
        },
      },
    });

    return NextResponse.json({ item: updated, publication: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft publishing failed.";

    if (item.state === "approved") {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          state: "approved",
        },
      }).catch(() => null);
    }

    await prisma.platformPublication.create({
      data: {
        contentItemId: item.id,
        platform: item.platform,
        action: "draft_created",
        error: message,
      },
    });

    await prisma.auditEvent.create({
      data: {
        businessId: item.businessId,
        contentItemId: item.id,
        actor: "publisher-service",
        action: "draft_publish_failed",
        fromState: item.state,
        toState: item.state,
        details: { error: message },
      },
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
