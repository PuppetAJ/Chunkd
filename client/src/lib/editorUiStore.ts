import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

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
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  saveStatus: "idle",
  saveMessage: "",
  setSaveStatus: (saveStatus, saveMessage = "") => set({ saveStatus, saveMessage }),
  flying: false,
  setFlying: (flying) => set({ flying }),
}));
