import type { BuildSource } from "./worldStore.ts";

const DRAFT_KEY = "chunkd-draft";

/**
 * A world kept in localStorage so a closed tab cannot lose an afternoon's
 * building. Not a save: it never leaves this browser and only one is kept.
 */
export interface Draft {
  /** Unix milliseconds, for telling someone how old it is. */
  savedAt: number;
  /** The build it came from, if it was opened from one. */
  source: BuildSource | null;
  /** The encoded world, in the same form a save uses. */
  data: string;
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<Draft>;
    if (typeof draft.data !== "string" || !draft.data) return null;
    if (typeof draft.savedAt !== "number") return null;
    const source =
      draft.source &&
      typeof draft.source.id === "string" &&
      typeof draft.source.name === "string"
        ? { id: draft.source.id, name: draft.source.name }
        : null;
    return { savedAt: draft.savedAt, source, data: draft.data };
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Out of room or storage off. A draft is a safety net and must not interrupt building.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // As above.
  }
}
