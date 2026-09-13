import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";

/** Enough of localStorage for the draft to be exercised outside a browser. */
class Storage {
  private items = new Map<string, string>();
  full = false;
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.full) throw new Error("QuotaExceededError");
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

let storage = new Storage();
(globalThis as { localStorage?: unknown }).localStorage = storage;

const { readDraft, writeDraft, clearDraft } = await import("./draft.ts");

beforeEach(() => {
  storage = new Storage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;
});

test("a draft comes back as it went in", () => {
  writeDraft({ savedAt: 1700000000000, source: { id: "abc", name: "Cabin" }, data: "payload" });
  assert.deepEqual(readDraft(), {
    savedAt: 1700000000000,
    source: { id: "abc", name: "Cabin" },
    data: "payload",
  });
});

test("a world that came from no build keeps no source", () => {
  writeDraft({ savedAt: 1, source: null, data: "payload" });
  assert.equal(readDraft()?.source, null);
});

test("there is nothing to offer when nothing was written", () => {
  assert.equal(readDraft(), null);
});

test("a draft can be thrown away", () => {
  writeDraft({ savedAt: 1, source: null, data: "payload" });
  clearDraft();
  assert.equal(readDraft(), null);
});

test("anything unreadable is treated as no draft at all", () => {
  storage.setItem("chunkd-draft", "not json");
  assert.equal(readDraft(), null);
  storage.setItem("chunkd-draft", JSON.stringify({ savedAt: 1 }));
  assert.equal(readDraft(), null, "a draft with no world is no draft");
  storage.setItem("chunkd-draft", JSON.stringify({ data: "payload" }));
  assert.equal(readDraft(), null, "nor is one with no time on it");
});

test("a half-written source is dropped rather than trusted", () => {
  storage.setItem("chunkd-draft", JSON.stringify({ savedAt: 1, data: "payload", source: { id: 7 } }));
  assert.deepEqual(readDraft(), { savedAt: 1, source: null, data: "payload" });
});

test("storage that refuses to take a draft does not throw", () => {
  storage.full = true;
  assert.doesNotThrow(() => writeDraft({ savedAt: 1, source: null, data: "payload" }));
});
