import test from "node:test";
import assert from "node:assert/strict";
import {
  getRoomCatalog,
  defaultRoomSettings,
  normalizeRoomSettings
} from "../src/rooms.mjs";

test("catalog identifies private rooms and keeps public Master Room separate", () => {
  const catalog = getRoomCatalog();
  assert.ok(catalog.some((room) => room.id === "music-studio"));
  assert.ok(catalog.some((room) => room.id === "social-media"));
  assert.ok(catalog.some((room) => room.id === "master-room"));
  assert.equal(
    normalizeRoomSettings(defaultRoomSettings()).order.includes("master-room"),
    false
  );
});

test("room settings reject unknown IDs and duplicate order entries", () => {
  const normalized = normalizeRoomSettings({
    order: ["music-studio", "unknown-room", "music-studio", "podcast"],
    layouts: {}
  });
  assert.equal(normalized.order[0], "music-studio");
  assert.equal(new Set(normalized.order).size, normalized.order.length);
  assert.equal(normalized.order.includes("unknown-room"), false);
});

test("layout settings accept only known themes and private room IDs", () => {
  const normalized = normalizeRoomSettings({
    order: [],
    layouts: {
      "music-studio": { theme: "midnight", arbitrary: "discard" },
      "social-media": { theme: "inject-css" },
      "master-room": { theme: "dark" },
      unknown: { theme: "dark" }
    }
  });
  assert.deepEqual(normalized.layouts["music-studio"], { theme: "midnight" });
  assert.deepEqual(normalized.layouts["social-media"], { theme: "default" });
  assert.equal(normalized.layouts["master-room"], undefined);
  assert.equal(normalized.layouts.unknown, undefined);
});

test("malformed settings normalize to safe defaults", () => {
  const normalized = normalizeRoomSettings(null);
  assert.ok(normalized.order.includes("game-development"));
  assert.deepEqual(normalized.layouts, {});
});
