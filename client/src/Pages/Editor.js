import React from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, PointerLockControls, KeyboardControls } from "@react-three/drei";
import { Physics, Debug } from "@react-three/rapier";
import { Cube, Cubes } from "../Components/Cube";
import { Ground } from "../Components/Ground";
import { Player } from "../Components/Player";
import { Ground2 } from "../Components/Ground2";

export default function Editor() {
  // Add basic block building
  // Find way to stitch textures together..?
  // https://github.com/pmndrs/react-three-fiber/discussions/761
  // https://codesandbox.io/s/vkgi6?file=/src/Player.js:179-198
  // Bring in various block textures

  return (
    <KeyboardControls
      map={[
        { name: "forward", keys: ["ArrowUp", "w", "W"] },
        { name: "backward", keys: ["ArrowDown", "s", "S"] },
        { name: "left", keys: ["ArrowLeft", "a", "A"] },
        { name: "right", keys: ["ArrowRight", "d", "D"] },
        { name: "jump", keys: ["Space"] },
      ]}
    >
      <Canvas shadows camera={{ fov: 45 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.3} />
        <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
        <Physics gravity={[0, 0, 0]}>
          {/* <Debug /> */}
          <Ground />
          <Ground2 />
          <Player />
          <Cube position={[0, 0.5, -10]} />
          <Cubes />
        </Physics>
        <PointerLockControls />
      </Canvas>
    </KeyboardControls>
  );
}
