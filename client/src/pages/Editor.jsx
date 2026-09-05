import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Sky,
  PointerLockControls,
  KeyboardControls,
  Preload,
} from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import { Cubes } from "../components/Cube";
import { Player } from "../components/Player";
import { Terrain } from "../components/Terrain";
import { SaveModal } from "../components/SaveModal";
import { Hotbar } from "../components/Hotbar";

// Access is handled by the RequireAuth wrapper around this route. The page used
// to repeat that check itself and, when it matched, redirect to "/Editor" with a
// capital E, which is not a route and fell through to the 404 page.
const KEY_MAP = [
  { name: "forward", keys: ["ArrowUp", "w", "W"] },
  { name: "backward", keys: ["ArrowDown", "s", "S"] },
  { name: "left", keys: ["ArrowLeft", "a", "A"] },
  { name: "right", keys: ["ArrowRight", "d", "D"] },
  { name: "jump", keys: ["Space"] },
  { name: "hotbar1", keys: ["1"] },
  { name: "hotbar2", keys: ["2"] },
  { name: "hotbar3", keys: ["3"] },
  { name: "hotbar4", keys: ["4"] },
  { name: "hotbar5", keys: ["5"] },
  { name: "hotbar6", keys: ["6"] },
  { name: "hotbar7", keys: ["7"] },
  { name: "hotbar8", keys: ["8"] },
  { name: "hotbar9", keys: ["9"] },
  { name: "save", keys: ["p", "P"] },
  { name: "shift", keys: ["Shift"] },
];

export default function Editor() {
  return (
    <KeyboardControls map={KEY_MAP}>
      <SaveModal />
      <Canvas
        className="z-10"
        id="editor"
        shadows
        camera={{ fov: 45 }}
        onContextMenu={(event) => event.preventDefault()}
        onCreated={(state) => {
          // Development-only handle on the renderer, camera and scene. The
          // end-to-end tests use it to aim the camera and count what was drawn,
          // which is otherwise unreachable from outside the canvas.
          if (import.meta.env.DEV) window.__r3f = state;
        }}
      >
        {/* Loading the physics engine's WebAssembly and the block textures both
            suspend. Without a boundary inside the Canvas that suspension travels
            up to the router, which unmounts the Canvas, destroys its WebGL
            context and leaves the editor permanently blank. */}
        <Suspense fallback={null}>
          <Preload all />
          <Sky
            elevation={0.6}
            rayleigh={1.558}
            azimuth={14.7}
            exposure={0.4349}
            sunPosition={[100, 10, 100]}
            turbidity={3.1}
          />
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
          <Physics gravity={[0, -30, 0]}>
            <Terrain />
            <Player />
            <Cubes />
          </Physics>
          <PointerLockControls />
        </Suspense>
      </Canvas>
      <Hotbar />
    </KeyboardControls>
  );
}
