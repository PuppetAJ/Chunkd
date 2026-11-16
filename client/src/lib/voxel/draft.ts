import type { BuildSource } from "./worldStore.ts";

const DRAFT_KEY = "chunkd-draft";

export interface Draft {
  savedAt: number;
  source: BuildSource | null;
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
    // Out of room or storage off.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
