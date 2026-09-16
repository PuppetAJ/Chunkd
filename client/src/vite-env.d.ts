/// <reference types="vite/client" />

import type { RootState } from "@react-three/fiber";
import type { Body } from "./lib/voxel/collision.ts";
import type { RenderLayer } from "./lib/voxel/render.ts";
import type { useWorldStore } from "./lib/voxel/worldStore.ts";

declare global {
  interface Window {
    /** Set only in development. The r3f root, for the end-to-end tests. */
    __r3f?: RootState;
    /** Set only in development. The voxel world store, for assertions. */
    __world?: typeof useWorldStore;
    /** Set only in development. The editor's render layers, so a test can see what was drawn. */
    __layers?: RenderLayer[];
    /**
     * Set only in development. The player's body. Move this, not the camera:
     * the controller resets the camera every frame.
     */
    __player?: Body;
    /** Set only in development. The saved-build viewer's orbit controls. */
    __viewer?: { target: { toArray: () => number[] }; object: { position: { toArray: () => number[] } } };
    /** Set only in development. The tool group; its first child carries the swing rotation. */
    __axe?: { children: { rotation: { x: number } }[] };
  }
}

export {};
