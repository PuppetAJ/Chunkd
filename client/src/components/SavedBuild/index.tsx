import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, Preload, Sky } from "@react-three/drei";
import { useQuery } from "@apollo/client/react";

import World from "../World/index.tsx";
import { QUERY_BUILD } from "../../utils/queries.ts";
import { deserializeWorld } from "../../lib/voxel/format.ts";
import { fromKey, type BlockKey } from "../../lib/voxel/coords.ts";
import { WORLD_SIZE } from "../../lib/voxel/terrain.ts";
import { LIGHTING, LIGHT_SCALE, useViewerSettings } from "../../lib/sceneSettings.ts";
import SceneSettingsMenu from "../SceneSettingsMenu.tsx";

interface Props {
  buildId: string;
  /**
   * Show the build's name in the corner of the viewer. Off where the name is
   * already on screen, such as a dialog that has it in its header.
   */
  showName?: boolean;
  /**
   * Turn the build slowly on its own. Used by the landing page, where the
   * viewer is something to look at rather than something to operate.
   */
  autoRotate?: boolean;
}

/** Where a build sits in space, and how far away the camera has to stay. */
interface Bounds {
  centre: [number, number, number];
  /** Radius of the sphere that contains every block. */
  radius: number;
  /** The underside of the build, which is where the floor grid is drawn. */
  minY: number;
}

/**
 * Measure the world so the camera can be framed around it.
 *
 * The viewer used to aim at a fixed point and allow unlimited zoom, which let
 * the camera travel inside the terrain. Once inside, every face is pointing
 * away and gets discarded, so solid ground looked like a hollow shell. Knowing
 * where the blocks actually are is what lets the zoom stop outside them.
 */
function measure(blocks: Map<BlockKey, number>): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const key of blocks.keys()) {
    const [x, y, z] = fromKey(key);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  if (minX === Infinity) {
    const half = WORLD_SIZE / 2;
    return { centre: [half, half, half], radius: half, minY: 0 };
  }

  // Blocks are placed by their centre and are one unit across, so the solid
  // extends half a unit past the outermost block centre on each side.
  const half: [number, number, number] = [
    (maxX - minX) / 2 + 0.5,
    (maxY - minY) / 2 + 0.5,
    (maxZ - minZ) / 2 + 0.5,
  ];

  return {
    centre: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    radius: Math.hypot(half[0], half[1], half[2]),
    minY: minY - 0.5,
  };
}

/**
 * Read-only view of one saved world.
 *
 * It renders through the same World component as the editor, so there is no
 * second copy of the block-drawing code to keep in step. It fetches the block
 * data itself, which is why listing builds elsewhere costs nothing.
 */
export default function SavedBuild({ buildId, autoRotate = false, showName = true }: Props) {
  // The chrome sits on the canvas, so its colours have to follow whatever the
  // canvas is showing. Light text vanished against the daylight sky.
  const settings = useViewerSettings((state) => state.settings);
  const setSettings = useViewerSettings((state) => state.setSettings);
  const onLightSky = settings.environment === "daylight";
  const labelClass = onLightSky ? "text-neutral-700" : "text-muted-foreground";
  const titleClass = onLightSky ? "text-neutral-900" : "text-foreground/90";
  const { loading, error, data } = useQuery(QUERY_BUILD, {
    variables: { id: buildId },
    skip: !buildId,
  });

  const build = (data as { build?: { data?: string; name?: string } } | undefined)?.build;
  const payload = build?.data;
  const world = useMemo(() => (payload ? deserializeWorld(payload) : null), [payload]);
  const bounds = useMemo(() => (world ? measure(world.blocks) : null), [world]);

  if (!buildId) return null;

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Loading build...
      </div>
    );
  }

  if (error || !payload) {
    // Usually means the build was deleted. On this site it more often means the
    // page is holding an id from before the scheduled reset, and reloading is
    // what fixes that, so say so rather than leaving a dead end.
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-muted-foreground">
        <p>This build is no longer available.</p>
        <p className="text-xs">Reload the page if it was here a moment ago.</p>
      </div>
    );
  }

  if (!world || !bounds) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        This build was saved in an older format and can no longer be opened.
      </div>
    );
  }

  const [cx, cy, cz] = bounds.centre;
  const start = bounds.radius * 1.9;

  // The component fills whatever box it is given. It used to carry its own
  // fixed 50%-of-the-page sizing, which was wrong everywhere it was reused.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-[#0d0c10]">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{
          fov: 45,
          far: bounds.radius * 12,
          position: [cx + start, cy + start * 0.55, cz + start],
        }}
      >
        {/* Block textures suspend while loading. Without a boundary here the
            suspension unmounts the Canvas and the viewer stays blank. */}
        <Suspense fallback={null}>
          <BuildScene world={world.blocks} bounds={bounds} autoRotate={autoRotate} />
        </Suspense>
      </Canvas>

      {/* Chrome drawn over the canvas rather than under it, so the viewer reads
          as a piece of the page instead of an embedded object. It never takes
          the pointer, because every gesture here belongs to the controls. */}
      <div
        // Named so the thumbnail generator can hide it, and so a test can find
        // it without matching on class names.
        data-viewer-chrome
        className="pointer-events-none absolute inset-0 p-3 sm:p-4"
      >
        {showName && build?.name && (
          <div>
            <p className={`font-mono text-[0.625rem] tracking-[0.2em] uppercase ${labelClass}`}>
              Saved build
            </p>
            <p className={`mt-0.5 font-display text-lg ${titleClass}`}>{build.name}</p>
          </div>
        )}
        <p
          className={`absolute right-3 bottom-3 font-mono text-[0.625rem] tracking-[0.15em] uppercase sm:right-4 sm:bottom-4 ${labelClass}`}
        >
          Drag to orbit &middot; shift drag to pan &middot; scroll to zoom
        </p>

        {/* The only thing in the overlay that takes a click. */}
        <div className="pointer-events-auto absolute top-3 right-3 sm:top-4 sm:right-4">
          <SceneSettingsMenu settings={settings} onChange={setSettings} onLightSky={onLightSky} />
        </div>
      </div>
    </div>
  );
}

function BuildScene({
  world,
  bounds,
  autoRotate,
}: {
  world: Map<BlockKey, number>;
  bounds: Bounds;
  autoRotate: boolean;
}) {
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const [cx, cy, cz] = bounds.centre;
  const extent = bounds.radius;

  const { environment, grid: showGrid, light } = useViewerSettings((state) => state.settings);

  const studio = environment === "studio";
  const scale = LIGHT_SCALE[light];
  const { ambient, key, fill } = LIGHTING[environment];

  return (
    <>
      <Preload all />

      {studio ? (
        <>
          {/* A dark room rather than a sky. The bright sky was the one element
              on the page fighting the rest of the interface, and a build reads
              better as an object on a floor than as landscape in daylight. */}
          <color attach="background" args={["#0d0c10"]} />
          {showGrid && (
            <Grid
              // Just under the lowest block, so a build stands on the floor
              // rather than hovering over it or sinking into it.
              position={[cx, bounds.minY, cz]}
              infiniteGrid
              cellSize={1}
              cellThickness={0.5}
              cellColor="#26252c"
              sectionSize={8}
              sectionThickness={1}
              sectionColor="#413f4d"
              fadeDistance={extent * 10}
              fadeStrength={1.5}
            />
          )}
        </>
      ) : (
        <Sky sunPosition={[100, 60, 100]} turbidity={3.1} rayleigh={1.558} />
      )}

      {/* Blocks carry their own face shading in the cube's vertex colours. The
          key light is layered on top of that for cast shadows, and in the
          studio a dim fill from the opposite side keeps the unlit faces from
          going flat black. */}
      <ambientLight intensity={ambient * scale} />
      <primitive object={lightTarget} position={[cx, cy, cz]} />
      <directionalLight
        castShadow
        target={lightTarget}
        intensity={key * scale}
        position={[cx + extent, cy + extent * 1.6, cz + extent * 0.7]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={extent * 6}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
      />
      {fill > 0 && (
        <directionalLight
          target={lightTarget}
          intensity={fill * scale}
          // Cool, and from behind and below, which is what a dark room does to
          // the side of an object the key light never reaches.
          color="#9fb6ff"
          position={[cx - extent * 1.2, cy - extent * 0.2, cz - extent]}
        />
      )}

      <BuildControls bounds={bounds} autoRotate={autoRotate} />
      <World blocks={world} />
    </>
  );
}

/**
 * Orbit, zoom and pan, with the camera kept outside the build.
 *
 * `minDistance` is the sphere that contains every block, so zooming stops just
 * before the near plane would cross into solid ground.
 *
 * Panning needs no code of its own. three's OrbitControls already pans when
 * shift is held and the left button is bound to rotating: it inverts whatever
 * the button is bound to while a modifier is down. An earlier version of this
 * component rebound the left button to panning on shift, which three then
 * inverted straight back to rotating, so shift and drag did nothing but turn
 * the model.
 */
function BuildControls({ bounds, autoRotate }: { bounds: Bounds; autoRotate: boolean }) {
  // ComponentRef asks React what this component's ref holds, which avoids
  // naming three's OrbitControls class here; it lives in a package this app
  // does not depend on directly.
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  // The controls are otherwise unreachable from outside the canvas, and a test
  // needs them to tell a pan from a rotate.
  useEffect(() => {
    if (import.meta.env.DEV) window.__viewer = controls.current ?? undefined;
  }, []);

  return (
    <OrbitControls
      ref={controls}
      target={bounds.centre}
      autoRotate={autoRotate}
      // Slow enough to read as a presentation rather than a spin.
      autoRotateSpeed={0.4}
      enablePan
      // Panning moves the target across the screen rather than along the ground
      // plane, which is what someone dragging a model expects.
      screenSpacePanning
      minDistance={bounds.radius * 1.08}
      maxDistance={bounds.radius * 4}
    />
  );
}
