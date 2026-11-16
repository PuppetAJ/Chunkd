import { create } from "zustand";

export type SceneEnvironment = "studio" | "daylight";

export type SceneLight = "dim" | "even" | "bright";

export interface SceneSettings {
  environment: SceneEnvironment;
  grid: boolean;
  light: SceneLight;
}

interface SceneSettingsStore {
  settings: SceneSettings;
  setSettings: (settings: SceneSettings) => void;
}

function load(storageKey: string, fallback: SceneSettings): SceneSettings {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<SceneSettings>;
    return {
      environment: saved.environment === "studio" || saved.environment === "daylight"
        ? saved.environment
        : fallback.environment,
      grid: typeof saved.grid === "boolean" ? saved.grid : fallback.grid,
      light: saved.light === "dim" || saved.light === "even" || saved.light === "bright"
        ? saved.light
        : fallback.light,
    };
  } catch {
    return fallback;
  }
}

function makeStore(storageKey: string, fallback: SceneSettings) {
  return create<SceneSettingsStore>((set) => ({
    settings: load(storageKey, fallback),
    setSettings: (settings) => {
      set({ settings });
      try {
        localStorage.setItem(storageKey, JSON.stringify(settings));
      } catch {}
    },
  }));
}

export const useViewerSettings = makeStore("viewer-settings", {
  environment: "studio",
  grid: true,
  light: "even",
});

export const useEditorSettings = makeStore("editor-settings", {
  environment: "daylight",
  grid: false,
  light: "even",
});

export const LIGHTING: Record<SceneEnvironment, { ambient: number; key: number; fill: number }> = {
  studio: { ambient: 0.55, key: 1.5, fill: 0.45 },
  daylight: { ambient: 1.5, key: 1.5, fill: 0 },
};

export const LIGHT_SCALE: Record<SceneLight, number> = {
  dim: 0.7,
  even: 1,
  bright: 1.45,
};
