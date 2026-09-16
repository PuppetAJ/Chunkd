import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
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
  /** Off where the name is already on screen, such as a dialog header. */
  showName?: boolean;
  /** Turn the build slowly on its own, for the landing page. */
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

/** Frames the camera, and keeps zoom outside the blocks, where every face is culled. */
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

  // Blocks are placed by their centre, so the solid extends half a unit past the outermost.
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

/** Read-only view of one saved world. It fetches its own block data. */
export default function SavedBuild({ buildId, autoRotate = false, showName = true }: Props) {
  // The chrome sits on the canvas, so its colours follow the sky.
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
    // Often an id from before the scheduled reset, which a reload fixes.
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

  return (
    // @container: the chrome responds to the viewer's width, not the window's.
    <div className="@container relative h-full w-full overflow-hidden rounded-lg border border-border bg-[#0d0c10]">
      <Canvas
        shadows
        dpr={[1, 2]}
        // Same tone mapping as Editor.tsx, so a build looks the same here as it did there.
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{
          fov: 45,
          far: bounds.radius * 12,
          position: [cx + start, cy + start * 0.55, cz + start],
        }}
      >
        {/* Without a boundary inside the Canvas, suspending textures unmount it. */}
        <Suspense fallback={null}>
          <BuildScene world={world.blocks} bounds={bounds} autoRotate={autoRotate} />
        </Suspense>
      </Canvas>

      <div
        // The thumbnail generator hides this, and a test finds it.
        data-viewer-chrome
        className="pointer-events-none absolute inset-0 p-3 @sm:p-4"
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
          className={`absolute inset-x-3 bottom-3 text-right font-mono text-[0.625rem] tracking-[0.15em] uppercase @sm:inset-x-4 @sm:bottom-4 ${labelClass}`}
        >
          Drag to orbit
          <span className="hidden @xs:inline"> &middot; shift drag to pan</span>
          <span className="hidden @md:inline"> &middot; scroll to zoom</span>
        </p>

        <div className="pointer-events-auto absolute top-3 right-3 @sm:top-4 @sm:right-4">
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
          <color attach="background" args={["#0d0c10"]} />
          {showGrid && (
            <Grid
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

      {/* Face shading is in the vertex colours; the lights add cast shadows and a fill. */}
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
          color="#9fb6ff"
          position={[cx - extent * 1.2, cy - extent * 0.2, cz - extent]}
        />
      )}

      <BuildControls bounds={bounds} autoRotate={autoRotate} />
      {autoRotate && <PreviewFrameRate />}
      <World blocks={world} />
    </>
  );
}

/** A slow turn needs nothing like the refresh rate, and Firefox pays for every frame. */
const PREVIEW_FRAMES_PER_SECOND = 30;

/**
 * A useFrame priority above zero takes over drawing from react-three-fiber,
 * which then draws nothing on its own. The controls still update every frame.
 */
function PreviewFrameRate() {
  const lastDrawn = useRef(0);
  useFrame(({ gl, scene, camera }) => {
    const now = performance.now();
    // A little under the interval, so a slightly early refresh still counts.
    if (now - lastDrawn.current < 1000 / PREVIEW_FRAMES_PER_SECOND - 2) return;
    lastDrawn.current = now;
    gl.render(scene, camera);
  }, 1);
  return null;
}

/**
 * Orbit, zoom and pan, with the camera kept outside the build. Panning needs no
 * code: OrbitControls inverts the bound button while a modifier is down, so
 * rebinding it for shift cancels itself out.
 */
function BuildControls({ bounds, autoRotate }: { bounds: Bounds; autoRotate: boolean }) {
  // ComponentRef avoids importing three's OrbitControls class, which lives in a
  // package this app does not depend on directly.
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  // A test needs the controls to tell a pan from a rotate.
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
      screenSpacePanning
      minDistance={bounds.radius * 1.08}
      maxDistance={bounds.radius * 4}
    />
  );
}
