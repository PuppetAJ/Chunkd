import { useCallback, useRef, useState } from "react";
import { useTexture } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree } from "@react-three/fiber";
import create from "zustand";
import dirt from "../../assets/textures/dirt.png";
import * as THREE from "three";

// This is a super naive implementation and wouldn't allow for more than a few thousand boxes.
// In order to make this scale this has to be one instanced mesh, then it could easily be
// hundreds of thousands.

export const useCubeStore = create((set) => ({
  cubes: [],
  addCube: (x, y, z) =>
    set((state) => ({ cubes: [...state.cubes, [x, y, z]] })),
  setCubes: (arr) => set((state) => ({ cubes: arr })),
}));

export const Cubes = () => {
  const cubes = useCubeStore((state) => state.cubes);
  return cubes.map((coords, index) => <Cube key={index} position={coords} />);
};

export function Cube(props) {
  const ref = useRef();
  const [hover, set] = useState(null);
  const cubes = useCubeStore((state) => state.cubes);
  const addCube = useCubeStore((state) => state.addCube);
  const setCubes = useCubeStore((state) => state.setCubes);
  const texture = useTexture(dirt);
  texture.magFilter = THREE.NearestFilter;
  const onMove = useCallback((e) => {
    e.stopPropagation();
    set(e.object);
  }, []);
  const onOut = useCallback(() => set(null), []);
  const onClick = (e) => {
    e.stopPropagation();

    if (window.event.button === 0) {
      const { x, y, z } = e.object.parent.position;

      const ind = cubes.findIndex(([x2, y2, z2]) => {
        if (x2 === x && y2 === y && z2 === z) {
          return true;
        }
      });

      if (ind !== -1) {
        const cubeMem = cubes.slice();
        cubeMem.splice(ind, 1);
        setCubes(cubeMem);
      }
    } else if (window.event.button === 2) {
      const { x, y, z } = ref.current.translation();
      const dir = [
        [x + 1, y, z],
        [x - 1, y, z],
        [x, y + 1, z],
        [x, y - 1, z],
        [x, y, z + 1],
        [x, y, z - 1],
      ];
      addCube(...dir[Math.floor(e.faceIndex / 2)]);
    }
  };

  return (
    <RigidBody {...props} type="fixed" colliders="cuboid" ref={ref}>
      <mesh
        receiveShadow
        castShadow
        onPointerMove={onMove}
        onPointerOut={onOut}
        onClick={onClick}
      >
        {[...Array(6)].map((_, index) => (
          <meshStandardMaterial
            attach={`material-${index}`}
            key={index}
            map={texture}
            color={hover ? "hotpink" : "white"}
          />
        ))}
        <boxGeometry />
      </mesh>
    </RigidBody>
  );
}
