import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Preload, Sky } from "@react-three/drei";
import { useQuery } from "@apollo/client/react";

import World from "../World/index.tsx";
import { QUERY_BUILD } from "../../utils/queries.ts";
import { deserializeWorld } from "../../lib/voxel/format.ts";
import { WORLD_SIZE } from "../../lib/voxel/terrain.ts";

interface Props {
  buildId: string;
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

  if (!buildId) return null;

  if (loading) {
    return <div className="p-4 text-center text-gray-300">Loading build...</div>;
  }

  if (error || !payload) {
    return <div className="p-4 text-center text-gray-400">This build is no longer available.</div>;
  }

  if (!world) {
    return (
      <div className="p-4 text-center text-gray-400">
        This build was saved in an older format and can no longer be opened.
      </div>
    );
  }

  const centre = WORLD_SIZE / 2;

  return (
    <div id="save-container" className="mt-8">
      <div id="save-wrapper">
        <Canvas shadows camera={{ fov: 45, position: [centre + 40, 34, centre + 40] }}>
          {/* Block textures suspend while loading. Without a boundary here the
              suspension unmounts the Canvas and the viewer stays blank. */}
          <Suspense fallback={null}>
            <BuildScene world={world.blocks} centre={centre} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

function BuildScene({
  world,
  centre,
}: {
  world: Map<string, number>;
  centre: number;
}) {
  return (
    <>
      <Preload all />
      <Sky sunPosition={[100, 60, 100]} turbidity={3.1} rayleigh={1.558} />
      <ambientLight intensity={2} />
      <directionalLight
        castShadow
        intensity={4}
        position={[40, 60, 25]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={180}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
      />
      <OrbitControls target={[centre, 6, centre]} enablePan={false} />
      <World blocks={world} />
    </>
  );
}
