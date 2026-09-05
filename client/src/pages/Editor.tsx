import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Preload, Sky } from "@react-three/drei";

import World from "../components/World/index.tsx";
import Player from "../components/Player/index.tsx";
import SaveControls from "../components/SaveControls/index.tsx";
import Hotbar from "../components/Hotbar/index.tsx";
import Inventory from "../components/Inventory/index.tsx";
import SaveToast from "../components/SaveToast/index.tsx";
import Crosshair from "../components/Crosshair/index.tsx";
import FlightIndicator from "../components/FlightIndicator/index.tsx";
import { useWorldStore } from "../lib/voxel/worldStore.ts";
import { WORLD_SIZE } from "../lib/voxel/terrain.ts";
import type { Body } from "../lib/voxel/collision.ts";

export default function Editor() {
  const centre = WORLD_SIZE / 2;
  // A little over half the diagonal, so the corners are still lit.
  const shadowExtent = WORLD_SIZE * 0.8;
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const seed = useWorldStore((state) => state.seed);
  const spawnPoint = useWorldStore((state) => state.spawnPoint);

  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyE") setInventoryOpen((open) => !open);
      if (event.code === "Escape") setInventoryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Mouse-look holds the pointer, which hides the cursor the inventory needs.
  useEffect(() => {
    if (inventoryOpen && document.pointerLockElement) document.exitPointerLock();
  }, [inventoryOpen]);

  // The player's position is deliberately not React state. It changes every
  // frame, and both the movement code and the block placement check read it
  // directly rather than through a re-render.
  const body = useMemo<Body>(() => {
    const [x, y, z] = spawnPoint();
    return { x, y, z, onGround: false };
  }, [seed, spawnPoint]);

  return (
    <>
      <Canvas
        className="z-10"
        id="editor"
        shadows
        camera={{ fov: 70, near: 0.1, far: 400 }}
        // Rendering at the screen's own pixel density is what stops block edges
        // looking ragged on a retina display; capped at 2 so a very dense screen
        // does not quadruple the work for no visible gain.
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={(state) => {
          // Development-only handles for the end-to-end tests: one to aim the
          // camera and read what was drawn, one to inspect the world itself.
          if (import.meta.env.DEV) {
            window.__r3f = state;
            window.__world = useWorldStore;
          }
        }}
      >
        {/* Block textures suspend while they load. Without a boundary inside
            the Canvas that suspension reaches the router, which unmounts the
            Canvas and destroys its WebGL context. */}
        <Suspense fallback={null}>
          <Preload all />
          <Sky sunPosition={[100, 60, 100]} turbidity={3.1} rayleigh={1.558} />
          {/* Blocks carry their own face shading in the cube's vertex colours;
              the sun is layered on top of that for cast shadows. Its camera is
              aimed at the middle of the world, because it defaults to the origin
              and that left the far half of the map unshadowed. */}
          <ambientLight intensity={1.5} />
          <primitive object={lightTarget} position={[centre, 0, centre]} />
          <directionalLight
            castShadow
            target={lightTarget}
            intensity={1.5}
            position={[centre + 60, 90, centre + 40]}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={1}
            shadow-camera-far={260}
            shadow-camera-left={-shadowExtent}
            shadow-camera-right={shadowExtent}
            shadow-camera-top={shadowExtent}
            shadow-camera-bottom={-shadowExtent}
          />
          <World editable playerBody={body} />
          <Player body={body} />
          <SaveControls />
        </Suspense>
        {/* Mouse-look would fight the cursor while the inventory is open. */}
        {!inventoryOpen && <PointerLockControls />}
      </Canvas>

      <Crosshair />
      <FlightIndicator />
      <Hotbar />
      <SaveToast />
      {inventoryOpen && <Inventory onClose={() => setInventoryOpen(false)} />}
    </>
  );
}
