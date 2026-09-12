import { create } from "zustand";

/**
 * How a voxel scene is lit and what it sits in. The viewer and the editor share
 * the vocabulary but keep separate preferences.
 *
 * The editor needs them because a build's thumbnail is a capture of its own
 * render at the moment you press P.
 */
export type SceneEnvironment = "studio" | "daylight";

/** Three steps rather than a slider: enough to fix a scene that reads too dark
 * or too washed out, without asking anyone to tune lighting by hand. */
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

/**
 * Read a saved preference.
 *
 * Anything unrecognised falls back to the default rather than being trusted:
 * this comes from storage that an older version of the app wrote, and a browser
 * can refuse to hand it over at all.
 */
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
        // Not being able to remember the choice is survivable.
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
 * The lighting each preset uses.
 *
 * The studio numbers are far lower than the daylight ones on purpose. Lighting
 * a model as though the sun were up while it floats in a black room is what
 * made the first dark scene look wrong: bright objects, dark nothing. Here the
 * key light does the work and the ambient only lifts the shadows off the floor.
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
