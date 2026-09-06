import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** A world captured and waiting for the player to name it. */
export interface PendingSave {
  /** The encoded world, taken at the moment the player asked to save. */
  data: string;
  /** A JPEG data URL of the view at that moment, or undefined if it failed. */
  thumbnail: string | undefined;
}

/**
 * Small amount of editor chrome state that lives outside the 3D canvas.
 *
 * The save confirmation used to be driven by reaching into the DOM with
 * document.querySelector and toggling CSS animation classes from inside the
 * render loop.
 */
interface EditorUiState {
  saveStatus: SaveStatus;
  saveMessage: string;
  setSaveStatus: (status: SaveStatus, message?: string) => void;

  /** Mirrors the player's flight state so the interface can show it. */
  flying: boolean;
  setFlying: (flying: boolean) => void;

  /**
   * Whether the player is in the world rather than looking at the pause screen.
   *
   * This is deliberately not read from document.pointerLockElement. A browser
   * can refuse pointer lock (an automated one always does), and tying the
   * whole editor to a request that may never be granted would leave the pause
   * screen up forever. Clicking to play sets this; losing pointer lock clears
   * it.
   */
  playing: boolean;
  setPlaying: (playing: boolean) => void;

  /**
   * Whether the block inventory is open.
   *
   * It lives here rather than in the editor's own state because pausing has to
   * know about it: the inventory is a menu, and the player should not keep
   * walking behind it.
   */
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
 * Whether the world should be standing still.
 *
 * Read outside React, from the frame loop and the input handlers, so it is a
 * plain function rather than a hook. Three things stop the world: the pause
 * screen, the naming dialog and the inventory. Without the second, typing "w"
 * into a build name walked the player off the ledge they were photographing.
 */
export function isEditorPaused(): boolean {
  const state = useEditorUiStore.getState();
  return !state.playing || state.pendingSave !== null || state.inventoryOpen;
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
