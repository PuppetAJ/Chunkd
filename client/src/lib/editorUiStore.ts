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
   * Set when the world has been captured and the naming dialog should open.
   * Capturing has to happen inside the canvas, but naming happens outside it,
   * so the two halves meet here.
   */
  pendingSave: PendingSave | null;
  setPendingSave: (pending: PendingSave | null) => void;
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  saveStatus: "idle",
  saveMessage: "",
  setSaveStatus: (saveStatus, saveMessage = "") => set({ saveStatus, saveMessage }),

  flying: false,
  setFlying: (flying) => set({ flying }),

  playing: false,
  setPlaying: (playing) => set({ playing }),

  pendingSave: null,
  setPendingSave: (pendingSave) => set({ pendingSave }),
}));
