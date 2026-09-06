import { create } from "zustand";

/**
 * How the build viewer draws a world.
 *
 * Two presets rather than a pile of sliders. "Studio" is a dark room with a
 * floor grid, which suits a page that is itself dark and makes a build read as
 * an object. "Daylight" is the sky the world was actually built under, which
 * is the honest view of it and what the in-game thumbnails look like.
 */
export type ViewerEnvironment = "studio" | "daylight";

/** Three steps rather than a slider: enough to fix a build that reads too dark
 * or too washed out, without asking anyone to tune lighting by hand. */
export type ViewerLight = "dim" | "even" | "bright";

export interface ViewerSettingsState {
  environment: ViewerEnvironment;
  grid: boolean;
  light: ViewerLight;
  setEnvironment: (environment: ViewerEnvironment) => void;
  setGrid: (grid: boolean) => void;
  setLight: (light: ViewerLight) => void;
}

const STORAGE_KEY = "viewer-settings";

const DEFAULTS = {
  environment: "studio" as ViewerEnvironment,
  grid: true,
  light: "even" as ViewerLight,
};

/**
 * Read the saved preference.
 *
 * Anything unrecognised falls back to the default rather than being trusted,
 * because this comes from storage a previous version of the app wrote, and a
 * browser can refuse to hand it over at all.
 */
function load(): typeof DEFAULTS {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Partial<typeof DEFAULTS>;
    return {
      environment: saved.environment === "daylight" ? "daylight" : "studio",
      grid: saved.grid !== false,
      light: saved.light === "dim" || saved.light === "bright" ? saved.light : "even",
    };
  } catch {
    return DEFAULTS;
  }
}

function save(settings: typeof DEFAULTS): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not being able to remember the choice is survivable.
  }
}

export const useViewerSettings = create<ViewerSettingsState>((set, get) => ({
  ...load(),

  setEnvironment: (environment) => {
    set({ environment });
    save({ environment, grid: get().grid, light: get().light });
  },
  setGrid: (grid) => {
    set({ grid });
    save({ environment: get().environment, grid, light: get().light });
  },
  setLight: (light) => {
    set({ light });
    save({ environment: get().environment, grid: get().grid, light });
  },
}));

/**
 * The lighting each preset uses.
 *
 * The studio numbers are much lower than the daylight ones on purpose. Lighting
 * a model as though the sun were up while it floats in a black room is the
 * thing that made the dark viewer look wrong: bright objects, dark nothing.
 * Here the key light does the work and the ambient only lifts the shadows off
 * the floor.
 */
export const LIGHTING: Record<ViewerEnvironment, { ambient: number; key: number; fill: number }> = {
  studio: { ambient: 0.55, key: 1.5, fill: 0.45 },
  daylight: { ambient: 1.5, key: 1.5, fill: 0 },
};

/** What each step does to those numbers. */
export const LIGHT_SCALE: Record<ViewerLight, number> = {
  dim: 0.7,
  even: 1,
  bright: 1.45,
};
