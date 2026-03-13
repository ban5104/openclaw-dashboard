import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { persistTelegramFeedback } from "@/lib/marketing-workspace";
import { canTransition } from "@/lib/state-machine";
import { isTelegramWebhookAuthorized, parseTelegramCallbackData } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!isTelegramWebhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized Telegram webhook." }, { status: 401 });
  }

  const body = await request.json();
  const callback = parseTelegramCallbackData(body?.callback_query?.data);
  const messageText =
    typeof body?.message?.text === "string"
      ? body.message.text
      : typeof body?.edited_message?.text === "string"
        ? body.edited_message.text
        : null;

  if (!callback && messageText) {
    const feedback = await persistTelegramFeedback({
      text: messageText,
      actor: body?.message?.from?.first_name ?? body?.edited_message?.from?.first_name ?? "Ben",
      chatTitle: body?.message?.chat?.title ?? body?.edited_message?.chat?.title ?? null,
    });

    if (isDatabaseConfigured()) {
      const business = await prisma.business.findUnique({
        where: { slug: feedback.businessSlug },
        select: { id: true },
      });

      if (business) {
        await prisma.auditEvent.create({
          data: {
            businessId: business.id,
            actor: "telegram",
            action: "feedback_logged",
            details: {
              category: feedback.category,
              targetFile: feedback.targetFile,
              platform: feedback.platform,
              note: messageText,
              paths: {
                memoryLogPath: feedback.memoryLogPath,
                memoryPath: feedback.memoryPath,
                businessNotePath: feedback.businessNotePath,
              },
            },
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      logged: true,
      category: feedback.category,
      targetFile: feedback.targetFile,
      platform: feedback.platform,
    });
  }

  if (!callback) {
    return NextResponse.json({ ok: true, skipped: "No callback action" });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: "DATABASE_URL missing" });
  }

  if (callback.action !== "mark_posted") {
    return NextResponse.json({ ok: true, skipped: "Unsupported action" });
  }

  const item = await prisma.contentItem.findUnique({
    where: { id: callback.contentItemId },
  });

  if (!item) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  if (!canTransition(item.state, "posted")) {
    return NextResponse.json(
      { error: `Content item cannot transition from ${item.state} to posted.` },
      { status: 400 },
    );
  }

  const updated = await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      state: "posted",
      postedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      businessId: item.businessId,
      contentItemId: item.id,
      actor: "telegram",
      action: "manual_post_confirmed",
      fromState: item.state,
      toState: "posted",
      details: body,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}
