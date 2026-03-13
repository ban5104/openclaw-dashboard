import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("brand-context-builder includes durable business note overlays", async () => {
  const workspaceDir = await mkdtemp(path.join(os.tmpdir(), "brand-context-workspace-"));
  const businessDir = path.join(workspaceDir, "businesses", "nelsonai");
  const examplesDir = path.join(businessDir, "examples");
  await mkdir(examplesDir, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(businessDir, "brand-profile.md"),
      "# Brand\n\n## Company Summary\nPractical AI for SMEs.\n\n## Positioning\nOperational improvement.\n\n## Tone & Voice\nDirect and useful.\n\n## Approved Claims\n- Valid claim.\n\n## CTA Preferences\nAsk for a call.\n",
      "utf8",
    ),
    writeFile(path.join(businessDir, "audience.md"), "Owners and operators.", "utf8"),
    writeFile(path.join(businessDir, "offers.md"), "AI Opportunity Snapshot", "utf8"),
    writeFile(path.join(businessDir, "compliance.md"), "No made-up numbers.", "utf8"),
    writeFile(path.join(businessDir, "writer-notes.md"), "Use conversational openings.", "utf8"),
    writeFile(path.join(businessDir, "reviewer-notes.md"), "Challenge vague claims.", "utf8"),
    writeFile(path.join(businessDir, "process-notes.md"), "Batch updates only.", "utf8"),
    writeFile(path.join(businessDir, "strategy-notes.md"), "Target local SMEs first.", "utf8"),
    writeFile(path.join(examplesDir, "winning-posts.md"), "Winning example", "utf8"),
    writeFile(path.join(examplesDir, "avoided-posts.md"), "Avoided example", "utf8"),
  ]);

  const scriptPath = path.join(
    process.cwd(),
    "openclaw",
    "workspaces",
    "marketing-ops",
    "skills",
    "brand-context-builder",
    "index.js",
  );

  const { stdout } = await execFileAsync(process.execPath, [scriptPath, "--slug", "nelsonai"], {
    env: {
      ...process.env,
      OPENCLAW_WORKSPACE: workspaceDir,
    },
  });

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.writer_notes, "Use conversational openings.");
  assert.equal(parsed.reviewer_notes, "Challenge vague claims.");
  assert.equal(parsed.process_notes, "Batch updates only.");
  assert.equal(parsed.strategy_notes, "Target local SMEs first.");
});
