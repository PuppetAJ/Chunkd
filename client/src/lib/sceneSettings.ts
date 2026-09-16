import { create } from "zustand";

/** How a voxel scene is lit and what it sits in. The viewer and the editor keep separate preferences. */
export type SceneEnvironment = "studio" | "daylight";

/** Three steps rather than a slider: enough to fix a scene that reads too dark or washed out. */
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

/** Anything unrecognised falls back to the default: an older version of the app may have written it. */
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
      } catch {
        // Forgetting the choice is survivable.
      }
    },
  }));
}

/** The viewer defaults to the studio, because the site around it is dark. */
export const useViewerSettings = makeStore("viewer-settings", {
  environment: "studio",
  grid: true,
  light: "even",
});

/** The editor defaults to daylight, because that is the world you build in. */
export const useEditorSettings = makeStore("editor-settings", {
  environment: "daylight",
  grid: false,
  light: "even",
});

/**
 * The studio numbers are far lower on purpose: a model lit as though the sun
 * were up, floating in a black room, looks wrong.
 */
export const LIGHTING: Record<SceneEnvironment, { ambient: number; key: number; fill: number }> = {
  studio: { ambient: 0.55, key: 1.5, fill: 0.45 },
  daylight: { ambient: 1.5, key: 1.5, fill: 0 },
};

/** What each step does to those numbers. */
export const LIGHT_SCALE: Record<SceneLight, number> = {
  dim: 0.7,
  even: 1,
  bright: 1.45,
};
