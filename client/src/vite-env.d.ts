/// <reference types="vite/client" />

import type { RootState } from "@react-three/fiber";
import type { useWorldStore } from "./lib/voxel/worldStore.ts";

declare global {
  interface Window {
    /**
     * Set only in development. Gives the end-to-end tests a handle on the
     * renderer, camera and scene, which are otherwise unreachable from outside
     * the canvas.
     */
    __r3f?: RootState;
    /** Set only in development. The voxel world store, for assertions. */
    __world?: typeof useWorldStore;
  }
}

export {};
