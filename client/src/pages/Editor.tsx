import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree, Canvas } from "@react-three/fiber";
import { Grid, PointerLockControls, Preload, Sky } from "@react-three/drei";

import World from "../components/World/index.tsx";
import Player from "../components/Player/index.tsx";
import SaveControls from "../components/SaveControls/index.tsx";
import Hotbar from "../components/Hotbar/index.tsx";
import Inventory from "../components/Inventory/index.tsx";
import SaveToast from "../components/SaveToast/index.tsx";
import Crosshair from "../components/Crosshair/index.tsx";
import FlightIndicator from "../components/FlightIndicator/index.tsx";
import EditorPause from "../components/EditorPause/index.tsx";
import SaveBuildDialog from "../components/SaveBuildDialog/index.tsx";
import { Toaster } from "../components/ui/sonner.tsx";
import { useEditorUiStore } from "../lib/editorUiStore.ts";
import { LIGHTING, LIGHT_SCALE, useEditorSettings } from "../lib/sceneSettings.ts";
import { useSuppressZoomGestures } from "../lib/useSuppressZoomGestures.ts";
import { useWorldStore } from "../lib/voxel/worldStore.ts";
import { WORLD_SIZE } from "../lib/voxel/terrain.ts";
import type { Body } from "../lib/voxel/collision.ts";

/**
 * Ask for the mouse. The pause screen and the inventory cover the canvas, so
 * drei's click-to-lock never sees the click that dismissed them. A refusal,
 * which is what an automated browser always does, leaves play running without it.
 */
function requestPointerLock(): void {
  try {
    document.querySelector("#editor canvas")?.requestPointerLock?.();
  } catch {
    // Refused. Nothing to recover; the crosshair simply stops following.
  }
}

/**
 * Mouse-look. Both props matter, and both are about drei's defaults.
 *
 * `selector` keeps its click-to-lock on the canvas; left alone it listens on the
 * whole document, so a click on the pause screen's settings took the mouse.
 *
 * `domElement` pins the lock to the canvas. Otherwise drei locks whatever
 * element the scene takes input from, which becomes the canvas's wrapper once
 * the scene has wired up, and clicks then never reach the canvas.
 *
 * It stays mounted through menus for the same reason: a second mount is what
 * moved the lock onto the wrapper. Menus cover the canvas anyway.
 */
function LookControls() {
  const canvas = useThree((state) => state.gl.domElement);
  return <PointerLockControls domElement={canvas} selector="#editor canvas" />;
}

export default function Editor() {
  const centre = WORLD_SIZE / 2;
  // A little over half the diagonal, so the corners are still lit.
  const shadowExtent = WORLD_SIZE * 0.8;
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const seed = useWorldStore((state) => state.seed);
  const size = useWorldStore((state) => state.size);
  const spawnPoint = useWorldStore((state) => state.spawnPoint);

  const [everPlayed, setEverPlayed] = useState(false);

  // A build's thumbnail is a capture of this render, so how the editor is lit
  // decides how the build looks everywhere else on the site.
  const { environment, grid: showGrid, light } = useEditorSettings((state) => state.settings);
  const studio = environment === "studio";
  const lightScale = LIGHT_SCALE[light];
  const lighting = LIGHTING[environment];

  const playing = useEditorUiStore((state) => state.playing);
  const setPlaying = useEditorUiStore((state) => state.setPlaying);
  const pendingSave = useEditorUiStore((state) => state.pendingSave);
  const inventoryOpen = useEditorUiStore((state) => state.inventoryOpen);

  // Zooming the page moves the crosshair away from where the player is aiming.
  useSuppressZoomGestures(true);

  // Closing the inventory puts the player straight back in the world. The
  // keypress or click that closed it counts as the gesture a browser wants
  // before it will hand the mouse back.
  const closeInventory = () => {
    useEditorUiStore.getState().setInventoryOpen(false);
    if (useEditorUiStore.getState().playing) requestPointerLock();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useEditorUiStore.getState();
      // Typing a build name should not also open the inventory.
      if (ui.pendingSave) return;

      if (event.code === "KeyE") {
        if (ui.inventoryOpen) closeInventory();
        // Only from play. Opened over the pause screen it hid that screen and
        // then closed back onto it, a menu on top of a paused game.
        else if (ui.playing) ui.setInventoryOpen(true);
      }

      if (event.code === "Escape") {
        // Escape means "back out of whatever I am in". With the inventory open
        // that is the inventory, not the game; pausing as well would drop the
        // player onto the pause screen for closing a menu.
        if (ui.inventoryOpen) {
          closeInventory();
          return;
        }
        // With the mouse really locked the browser releases it and the handler
        // below pauses. When the lock was never granted there is no such event,
        // and without this the pause screen would be unreachable.
        if (!document.pointerLockElement) ui.setPlaying(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Registered once. Everything it reads comes from the store rather than
    // from a render, so there is nothing here that can go stale.
  }, []);

  // Losing the mouse is the browser's way of pausing, so the editor follows it.
  useEffect(() => {
    const onChange = () => {
      if (document.pointerLockElement) return;
      // The lock is also released deliberately when the inventory or the naming
      // dialog opens. That is a menu, not the player asking to stop.
      const ui = useEditorUiStore.getState();
      if (ui.inventoryOpen || ui.pendingSave) return;
      setPlaying(false);
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => {
      document.removeEventListener("pointerlockchange", onChange);
      // Leaving the route should not leave the store thinking a game is running.
      setPlaying(false);
      useEditorUiStore.getState().setInventoryOpen(false);
    };
  }, [setPlaying]);

  const startPlaying = () => {
    setEverPlayed(true);
    setPlaying(true);
    requestPointerLock();
  };

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
    // Neither `seed` nor `size` is read here, but `spawnPoint`'s identity never
    // changes, so without them a new world reuses the old spawn point.
    // oxlint-disable-next-line exhaustive-deps
  }, [seed, size, spawnPoint]);

  // Development-only handle on the player's box, so a test can stand them
  // somewhere. An effect, not canvas setup: a new world makes a new body, and
  // the canvas is created once, so that would go stale.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__player = body;
    return () => {
      delete window.__player;
    };
  }, [body]);

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
        // The filmic curve is not colour accurate, taking about a third off the
        // red and blue of a lit grass block, but its contrast is what gives the
        // scene its punch. The exposure lift pays back the darkening.
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
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
          {studio ? (
            <>
              <color attach="background" args={["#0d0c10"]} />
              {showGrid && (
                <Grid
                  position={[centre, 0, centre]}
                  infiniteGrid
                  cellSize={1}
                  cellThickness={0.5}
                  cellColor="#26252c"
                  sectionSize={8}
                  sectionThickness={1}
                  sectionColor="#413f4d"
                  fadeDistance={WORLD_SIZE * 3}
                  fadeStrength={1.5}
                />
              )}
            </>
          ) : (
            <Sky sunPosition={[100, 60, 100]} turbidity={3.1} rayleigh={1.558} />
          )}
          {/* Blocks carry their own face shading in the cube's vertex colours;
              the sun is layered on top of that for cast shadows. Its camera is
              aimed at the middle of the world, because it defaults to the origin
              and that left the far half of the map unshadowed. */}
          <ambientLight intensity={lighting.ambient * lightScale} />
          <primitive object={lightTarget} position={[centre, 0, centre]} />
          {lighting.fill > 0 && (
            <directionalLight
              target={lightTarget}
              intensity={lighting.fill * lightScale}
              color="#9fb6ff"
              position={[centre - 60, 20, centre - 40]}
            />
          )}
          <directionalLight
            castShadow
            target={lightTarget}
            intensity={lighting.key * lightScale}
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
        {/* Mouse-look would fight the cursor while the inventory or the save
            dialog is open, and there is nothing to look at while paused. */}
        <LookControls />
      </Canvas>

      <Crosshair />
      <FlightIndicator />
      <Hotbar />
      <SaveToast />
      {inventoryOpen && <Inventory onClose={closeInventory} />}
      <SaveBuildDialog />
      {/* The editor is routed outside the site shell, so it carries its own. */}
      <Toaster />

      {/* The pause screen would otherwise stack on top of the two things that
          legitimately take the mouse away from the world. */}
      {!playing && !inventoryOpen && !pendingSave && (
        <EditorPause firstVisit={!everPlayed} onPlay={startPlaying} />
      )}
    </>
  );
}
