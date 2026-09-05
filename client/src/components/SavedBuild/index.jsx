import { Canvas } from "@react-three/fiber";
import {
  Sky,
  Preload,
  OrbitControls,
} from "@react-three/drei";
import { useQuery } from "@apollo/client/react";

import { Save } from "../Save";
import { QUERY_BUILD } from "../../utils/queries.ts";

// Renders one saved world.
//
// It now takes a build id and fetches the world data itself, so a page that
// merely lists builds never downloads them. It also no longer repeats an auth
// check: viewing a build attached to a public post does not require an account.
export default function SavedBuild({ buildId }) {
  const { loading, error, data } = useQuery(QUERY_BUILD, {
    variables: { id: buildId },
    skip: !buildId,
  });

  if (!buildId) return null;

  if (loading) {
    return <div className="text-gray-300 text-center p-4">Loading build...</div>;
  }

  if (error || !data?.build) {
    return (
      <div className="text-gray-400 text-center p-4">
        This build is no longer available.
      </div>
    );
  }

  return (
    <div id="save-container" className="mt-8">
      <div id="save-wrapper">
        <Canvas shadows camera={{ fov: 45, position: [-40, 20, -40] }}>
          <Preload all />
          <Sky
            elevation={0.6}
            rayleigh={1.558}
            azimuth={14.7}
            exposure={0.4349}
            sunPosition={[100, 10, 100]}
            turbidity={3.1}
          />
          <OrbitControls />
          <Save build={data.build.data} />
          {/* three.js r155 made lights physically correct by default. A point
              light 170 units away with intensity 0.8 now contributes almost
              nothing, which left the whole world black. A directional light
              does not fall off with distance, and its shadow frustum can be
              tightened around the build area, which is also far cheaper than
              the cube shadow map a point light needs. */}
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
        </Canvas>
      </div>
    </div>
  );
}
