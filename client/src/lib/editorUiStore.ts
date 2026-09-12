import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** A world captured and waiting for the player to name it. */
export interface PendingSave {
  /** The encoded world, taken at the moment the player asked to save. */
  data: string;
  /** A JPEG data URL of the view at that moment, or undefined if it failed. */
  thumbnail: string | undefined;
}

/** Editor chrome state that lives outside the 3D canvas. */
interface EditorUiState {
  saveStatus: SaveStatus;
  saveMessage: string;
  setSaveStatus: (status: SaveStatus, message?: string) => void;

  /** Mirrors the player's flight state so the interface can show it. */
  flying: boolean;
  setFlying: (flying: boolean) => void;

  /**
   * Whether the player is in the world rather than on the pause screen. Not
   * read from document.pointerLockElement: a browser can refuse the lock, and
   * the pause screen would then never go away.
   */
  playing: boolean;
  setPlaying: (playing: boolean) => void;

  /** Whether the inventory is open. Here because pausing has to know about it. */
  inventoryOpen: boolean;
  setInventoryOpen: (open: boolean) => void;

  /**
   * Set when the world has been captured and the naming dialog should open.
   * Capturing has to happen inside the canvas, but naming happens outside it,
   * so the two halves meet here.
   */
  pendingSave: PendingSave | null;
  setPendingSave: (pending: PendingSave | null) => void;
}

/**
 * Whether the world should stand still. A plain function, not a hook: the frame
 * loop and the input handlers read it. The naming dialog counts as well, or
 * typing "w" into a build name walks the player off the ledge.
 */
export function isEditorPaused(): boolean {
  const state = useEditorUiStore.getState();
  return !state.playing || state.pendingSave !== null || state.inventoryOpen;
}

/**
 * When the held tool last swung. Outside the store: it is read every frame, and
 * as state it would re-render the editor on every hit.
 */
let swungAt = 0;

/** Start a swing. Called wherever a block is actually broken or placed. */
export function swingTool(): void {
  swungAt = performance.now();
}

/** How long ago the tool swung, in milliseconds. */
export function sinceSwing(): number {
  return performance.now() - swungAt;
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  saveStatus: "idle",
  saveMessage: "",
  setSaveStatus: (saveStatus, saveMessage = "") => set({ saveStatus, saveMessage }),

  flying: false,
  setFlying: (flying) => set({ flying }),

  playing: false,
  setPlaying: (playing) => set({ playing }),

  inventoryOpen: false,
  setInventoryOpen: (inventoryOpen) => set({ inventoryOpen }),

  pendingSave: null,
  setPendingSave: (pendingSave) => set({ pendingSave }),
}));
