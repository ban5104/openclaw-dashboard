import test from "node:test";
import assert from "node:assert/strict";
import { buildSkillCommand, getSkillScriptPath } from "@/lib/openclaw-runtime";

test("skill command resolves to repo-shipped marketing ops skill", () => {
  const command = buildSkillCommand("db-state-manager", "transition", {
    "content-item-id": "abc-123",
    "to-state": "ready_to_post",
  });

  assert.equal(command[0], process.execPath);
  assert.equal(command[1], getSkillScriptPath("db-state-manager"));
  assert.deepEqual(command.slice(2), [
    "--action",
    "transition",
    "--content-item-id",
    "abc-123",
    "--to-state",
    "ready_to_post",
  ]);
});

test("skill command skips nullish args and stringifies booleans", () => {
  const command = buildSkillCommand("analytics-collector", "collect", {
    "content-item-id": "abc-123",
    "transition-state": false,
    "snapshot-date": null,
  });

  assert.deepEqual(command.slice(2), [
    "--action",
    "collect",
    "--content-item-id",
    "abc-123",
    "--transition-state",
    "false",
  ]);
});
