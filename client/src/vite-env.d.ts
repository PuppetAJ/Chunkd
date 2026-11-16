/// <reference types="vite/client" />

import type { RootState } from "@react-three/fiber";
import type { Body } from "./lib/voxel/collision.ts";
import type { RenderLayer } from "./lib/voxel/render.ts";
import type { useWorldStore } from "./lib/voxel/worldStore.ts";

declare global {
  interface Window {
    __r3f?: RootState;
    __world?: typeof useWorldStore;
    __layers?: RenderLayer[];
    __player?: Body;
    __viewer?: { target: { toArray: () => number[] }; object: { position: { toArray: () => number[] } } };
    __axe?: { children: { rotation: { x: number } }[] };
  }
}

export {};
