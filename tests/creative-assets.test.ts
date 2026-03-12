import test from "node:test";
import assert from "node:assert/strict";
import { buildCreativeAssetDocument, lexicalSimilarity } from "@/lib/creative-assets";

test("creative asset document includes title, caption, and tags", () => {
  const document = buildCreativeAssetDocument({
    title: "Executive workflow",
    caption: "Operator with process overlay",
    tags: ["workflow", "operator"],
  });

  assert.match(document, /Executive workflow/);
  assert.match(document, /Operator with process overlay/);
  assert.match(document, /workflow operator/);
});

test("lexical similarity rewards overlapping image language", () => {
  const score = lexicalSimilarity(
    "executive workflow dashboard",
    "Executive portrait with workflow dashboard overlay",
  );

  assert.equal(score > 0.5, true);
});
