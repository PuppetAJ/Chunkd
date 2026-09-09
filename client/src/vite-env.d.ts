/// <reference types="vite/client" />

import type { RootState } from "@react-three/fiber";
import type { Body } from "./lib/voxel/collision.ts";
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
    /**
     * Set only in development. The player's own box, so a test or a screenshot
     * script can stand them somewhere. Moving the camera instead does nothing:
     * the player controller puts it back on the body every frame, whether the
     * editor is paused or not.
     */
    __player?: Body;
    /**
     * Set only in development. The saved-build viewer's orbit controls, so a
     * test can tell panning apart from rotating: panning moves `target`,
     * rotating leaves it where it is.
     */
    __viewer?: { target: { toArray: () => number[] }; object: { position: { toArray: () => number[] } } };
  }
}

export {};
