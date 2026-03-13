import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  classifyTelegramFeedback,
  persistTelegramFeedback,
} from "@/lib/marketing-workspace";

test("classifyTelegramFeedback routes writing guidance to writer notes", () => {
  const result = classifyTelegramFeedback(
    "The last few LinkedIn posts are too formal. Use a more conversational tone and a stronger CTA.",
  );

  assert.equal(result.category, "content_feedback");
  assert.equal(result.targetFile, "writer-notes.md");
  assert.equal(result.platform, "linkedin");
});

test("classifyTelegramFeedback routes review guidance to reviewer notes", () => {
  const result = classifyTelegramFeedback(
    "The reviewer needs to be stricter on claim safety and compliance wording.",
  );

  assert.equal(result.category, "content_feedback");
  assert.equal(result.targetFile, "reviewer-notes.md");
  assert.equal(result.platform, null);
});

test("persistTelegramFeedback writes memory and business overlays", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "marketing-workspace-"));
  const timestamp = new Date("2026-03-13T09:15:00.000Z");

  const result = await persistTelegramFeedback({
    text: "Keep Facebook posts more conversational and less polished.",
    businessSlug: "nelsonai",
    workspaceDir,
    timestamp,
    actor: "Ben",
    chatTitle: "Marketing Ops",
  });

  const [memoryLog, memory, businessNote] = await Promise.all([
    readFile(result.memoryLogPath, "utf8"),
    readFile(result.memoryPath, "utf8"),
    readFile(result.businessNotePath, "utf8"),
  ]);

  assert.match(memoryLog, /Target file: writer-notes\.md/);
  assert.match(memory, /content_feedback/);
  assert.match(businessNote, /Marketing Ops/);
  assert.match(businessNote, /less polished/);
});
