import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, Sky } from "@react-three/drei";
import { useQuery } from "@apollo/client/react";

import World from "../World/index.tsx";
import { QUERY_BUILD } from "../../utils/queries.ts";
import { deserializeWorld } from "../../lib/voxel/format.ts";
import { fromKey, type BlockKey } from "../../lib/voxel/coords.ts";
import { WORLD_SIZE } from "../../lib/voxel/terrain.ts";

interface Props {
  buildId: string;
}

/** Where a build sits in space, and how far away the camera has to stay. */
interface Bounds {
  centre: [number, number, number];
  /** Radius of the sphere that contains every block. */
  radius: number;
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
    return { centre: [half, half, half], radius: half };
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
  };
}

/**
 * Read-only view of one saved world.
 *
 * It renders through the same World component as the editor, so there is no
 * second copy of the block-drawing code to keep in step. It fetches the block
 * data itself, which is why listing builds elsewhere costs nothing.
 */
export default function SavedBuild({ buildId }: Props) {
  const { loading, error, data } = useQuery(QUERY_BUILD, {
    variables: { id: buildId },
    skip: !buildId,
  });

  const payload = (data as { build?: { data?: string } } | undefined)?.build?.data;
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
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        This build is no longer available.
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
    <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-background">
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
          <BuildScene world={world.blocks} bounds={bounds} />
        </Suspense>
      </Canvas>
    </div>
  );
}

function BuildScene({ world, bounds }: { world: Map<BlockKey, number>; bounds: Bounds }) {
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const [cx, cy, cz] = bounds.centre;
  const extent = bounds.radius;

  return (
    <>
      <Preload all />
      <Sky sunPosition={[100, 60, 100]} turbidity={3.1} rayleigh={1.558} />
      {/* Blocks carry their own face shading; the sun adds the cast shadows. */}
      <ambientLight intensity={1.5} />
      <primitive object={lightTarget} position={[cx, cy, cz]} />
      <directionalLight
        castShadow
        target={lightTarget}
        intensity={1.5}
        position={[cx + extent, cy + extent * 1.6, cz + extent * 0.7]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={extent * 6}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
      />
      <BuildControls bounds={bounds} />
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
function BuildControls({ bounds }: { bounds: Bounds }) {
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
      enablePan
      // Panning moves the target across the screen rather than along the ground
      // plane, which is what someone dragging a model expects.
      screenSpacePanning
      minDistance={bounds.radius * 1.08}
      maxDistance={bounds.radius * 4}
    />
  );
}
