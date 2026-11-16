import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface PendingSave {
  data: string;
  thumbnail: string | undefined;
}

interface EditorUiState {
  saveStatus: SaveStatus;
  saveMessage: string;
  setSaveStatus: (status: SaveStatus, message?: string) => void;

  flying: boolean;
  setFlying: (flying: boolean) => void;

  /**
   * Not read from document.pointerLockElement: a browser can refuse the lock.
   */
  playing: boolean;
  setPlaying: (playing: boolean) => void;

  inventoryOpen: boolean;
  setInventoryOpen: (open: boolean) => void;

  pendingSave: PendingSave | null;
  setPendingSave: (pending: PendingSave | null) => void;
}

export function isEditorPaused(): boolean {
  const state = useEditorUiStore.getState();
  return !state.playing || state.pendingSave !== null || state.inventoryOpen;
}

let swungAt = 0;

export function swingTool(): void {
  swungAt = performance.now();
}

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
