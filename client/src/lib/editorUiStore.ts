import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** A world captured and waiting for the player to name it. */
export interface PendingSave {
  /** The encoded world. */
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
   * In the world rather than on the pause screen. Not read from
   * document.pointerLockElement: a browser can refuse the lock.
   */
  playing: boolean;
  setPlaying: (playing: boolean) => void;

  /** Whether the inventory is open. Here because pausing has to know about it. */
  inventoryOpen: boolean;
  setInventoryOpen: (open: boolean) => void;

  /** Set when the world has been captured inside the canvas and the naming dialog outside it should open. */
  pendingSave: PendingSave | null;
  setPendingSave: (pending: PendingSave | null) => void;
}

/**
 * A plain function, not a hook: the frame loop reads it. The naming dialog
 * counts, or typing "w" into a build name walks the player off a ledge.
 */
export function isEditorPaused(): boolean {
  const state = useEditorUiStore.getState();
  return !state.playing || state.pendingSave !== null || state.inventoryOpen;
}

/** When the tool last swung. Outside the store because it is read every frame. */
let swungAt = 0;

/** Start a swing. */
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
