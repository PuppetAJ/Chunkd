import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@apollo/client/react";
import { toast } from "sonner";
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
import SessionExpired from "../components/SessionExpired/index.tsx";
import DraftRestore from "../components/DraftRestore/index.tsx";
import { Toaster } from "../components/ui/sonner.tsx";
import { useAuthStore } from "../lib/auth.ts";
import { useEditorUiStore } from "../lib/editorUiStore.ts";
import { LIGHTING, LIGHT_SCALE, useEditorSettings } from "../lib/sceneSettings.ts";
import { useSuppressZoomGestures } from "../lib/useSuppressZoomGestures.ts";
import { useWorldStore } from "../lib/voxel/worldStore.ts";
import { clearDraft, readDraft, type Draft } from "../lib/voxel/draft.ts";
import { useWorldDraft } from "../lib/useWorldDraft.ts";
import { WORLD_SIZE } from "../lib/voxel/terrain.ts";
import { QUERY_BUILD } from "../utils/queries.ts";
import type { Body } from "../lib/voxel/collision.ts";

/**
 * The pause screen and inventory cover the canvas, so drei's click-to-lock
 * never sees the click that dismissed them.
 */
function requestPointerLock(): void {
  try {
    document.querySelector("#editor canvas")?.requestPointerLock?.();
  } catch {
    // Refused; play carries on without the lock.
  }
}

/**
 * `selector` keeps drei's click-to-lock on the canvas instead of the whole document.
 * `domElement` pins the lock to the canvas; otherwise drei locks the canvas's wrapper
 * once the scene is wired up. Stays mounted through menus: a remount moves the lock onto the wrapper.
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

  // A build named in the URL is loaded in place of the fresh world; play waits for it.
  const [params, setParams] = useSearchParams();
  const buildId = params.get("build");
  const source = useWorldStore((state) => state.source);
  const loadBuild = useWorldStore((state) => state.loadBuild);
  // Which build this world came from. Not the store's `source`: saving under a
  // second name moves that, and the address would then fetch the old build back
  // over the world in progress.
  const [held, setHeld] = useState<string | null>(null);
  const wanted = buildId !== null && buildId !== held;
  const { data: fetchedData, error: fetchError } = useQuery(QUERY_BUILD, {
    variables: { id: buildId ?? "" },
    skip: !wanted,
  });
  const fetched = (fetchedData as { build?: { _id: string; name: string; data: string } | null } | undefined)
    ?.build;
  useEffect(() => {
    if (!wanted) return;
    if (fetchError) {
      // Held anyway, so a build that cannot be read is not asked for again.
      setHeld(buildId);
      toast.error("That build could not be loaded.");
      return;
    }
    if (!fetched) return;
    setHeld(buildId);
    if (!loadBuild(fetched.data, { id: fetched._id, name: fetched.name })) {
      toast.error("That build was saved in a format this version cannot read.");
    }
  }, [wanted, buildId, fetched, fetchError, loadBuild]);
  const loadingBuild = wanted && !fetchError ? (fetched?.name ?? "your build") : null;

  // The address names whichever build the editor is holding, so a link reopens what is on screen.
  useEffect(() => {
    if (wanted) return;
    const id = source?.id ?? null;
    if (id === buildId) return;
    setHeld(id);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (id) next.set("build", id);
        else next.delete("build");
        return next;
      },
      { replace: true },
    );
  }, [wanted, source, buildId, setParams]);

  useWorldDraft();

  // The draft is offered only once whatever the address asked for has arrived,
  // or that build would land on top of the restored one.
  const [draft, setDraft] = useState<Draft | null>(null);
  const offeredDraft = useRef(false);
  useEffect(() => {
    if (wanted || offeredDraft.current) return;
    offeredDraft.current = true;
    setDraft(readDraft());
  }, [wanted]);

  const restoreDraft = () => {
    if (!draft) return;
    if (loadBuild(draft.data, draft.source ?? undefined)) {
      // Restored work is still unsaved work, so it keeps being drafted.
      useWorldStore.getState().setEdited(true);
      setHeld(draft.source?.id ?? null);
    } else {
      toast.error("That unsaved world could not be read.");
      clearDraft();
    }
    setDraft(null);
  };

  const discardDraft = () => {
    clearDraft();
    setDraft(null);
  };

  const { environment, grid: showGrid, light } = useEditorSettings((state) => state.settings);
  const studio = environment === "studio";
  const lightScale = LIGHT_SCALE[light];
  const lighting = LIGHTING[environment];

  const playing = useEditorUiStore((state) => state.playing);
  const setPlaying = useEditorUiStore((state) => state.setPlaying);
  const pendingSave = useEditorUiStore((state) => state.pendingSave);
  const inventoryOpen = useEditorUiStore((state) => state.inventoryOpen);

  useSuppressZoomGestures(true);

  // The gesture that closed it is what lets the browser hand the mouse back.
  const closeInventory = () => {
    useEditorUiStore.getState().setInventoryOpen(false);
    if (useEditorUiStore.getState().playing) requestPointerLock();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useEditorUiStore.getState();
      // Typing a build name should not also open the inventory.
      if (ui.pendingSave) return;

      // A control that took focus would answer the next Space or Enter as a click.
      if (event.code === "Tab" && ui.playing && !ui.inventoryOpen) event.preventDefault();

      if (event.code === "KeyE") {
        if (ui.inventoryOpen) closeInventory();
        // Only from play, not over the pause screen.
        else if (ui.playing) ui.setInventoryOpen(true);
      }

      if (event.code === "Escape") {
        // Escape backs out of the inventory, not the game.
        if (ui.inventoryOpen) {
          closeInventory();
          return;
        }
        // With a real lock the browser releases it and the change handler
        // pauses. Without one there is no such event, so pause here.
        if (!document.pointerLockElement) ui.setPlaying(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Everything it reads comes from the store, so nothing here goes stale.
  }, []);

  // Losing the mouse is the browser's way of pausing, so the editor follows it.
  useEffect(() => {
    const onChange = () => {
      if (document.pointerLockElement) return;
      // The lock is also released on purpose for the inventory and the naming dialog.
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

  // The route keeps the editor mounted through an expired session; this stops
  // the world moving under the sign-in box.
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  useEffect(() => {
    if (isLoggedIn) return;
    setPlaying(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }, [isLoggedIn, setPlaying]);

  // Deliberately not React state: it changes every frame.
  const body = useMemo<Body>(() => {
    const [x, y, z] = spawnPoint();
    return { x, y, z, onGround: false };
    // `spawnPoint`'s identity never changes, so without `seed` and `size` a
    // new world would reuse the old spawn point.
    // oxlint-disable-next-line exhaustive-deps
  }, [seed, size, spawnPoint]);

  // An effect, not canvas setup: a new world makes a new body and the canvas is created once.
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
        // Capped at 2 so a very dense screen does not quadruple the work.
        dpr={[1, 2]}
        // ACES is not colour accurate but gives the scene its contrast; the
        // exposure lift pays back the darkening.
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={(state) => {
          // Development-only handles for the end-to-end tests.
          if (import.meta.env.DEV) {
            window.__r3f = state;
            window.__world = useWorldStore;
          }
        }}
      >
        {/* Without a boundary inside the Canvas, a suspension reaches the router,
            which unmounts the Canvas and destroys its WebGL context. */}
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
          {/* The sun's shadow camera is aimed at the middle of the world; it
              defaults to the origin, which left the far half unshadowed. */}
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
        <LookControls />
      </Canvas>

      <Crosshair />
      <FlightIndicator />
      <Hotbar />
      <SaveToast />
      {inventoryOpen && <Inventory onClose={closeInventory} />}
      <SaveBuildDialog />
      {!isLoggedIn && <SessionExpired />}
      {draft && <DraftRestore draft={draft} onRestore={restoreDraft} onDiscard={discardDraft} />}
      {/* The editor is routed outside the site shell, so it carries its own. */}
      <Toaster />

      {isLoggedIn && !draft && !playing && !inventoryOpen && !pendingSave && (
        <EditorPause firstVisit={!everPlayed} loading={loadingBuild} onPlay={startPlaying} />
      )}
    </>
  );
}
