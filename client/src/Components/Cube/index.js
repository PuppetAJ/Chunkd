import { useCallback, useEffect, useRef, useState } from "react";
import { useTexture } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree, useFrame } from "@react-three/fiber";
import create from "zustand";
import * as THREE from "three";
import { useSelectedStore } from "../Player";
import dirtText from "../../assets/textures/dirt.png";
import grassText from "../../assets/textures/grass.png";

export const useCubeStore = create((set) => ({
  cubes: [],
  addCube: (data) => set((state) => ({ cubes: [...state.cubes, data] })),
  setCubes: (arr) => set((state) => ({ cubes: arr })),
}));

export const Cubes = () => {
  const cubes = useCubeStore((state) => state.cubes);
  return cubes.map((data, index) => (
    <Cube
      key={index}
      position={data.position}
      map={data.texture}
      col={data.color}
    />
  ));
};

export function Cube(props) {
  const { camera } = useThree();
  const ref = useRef();
  const [hover, set] = useState(null);
  const cubes = useCubeStore((state) => state.cubes);
  const addCube = useCubeStore((state) => state.addCube);
  const setCubes = useCubeStore((state) => state.setCubes);

  const selected = useSelectedStore((state) => state.selected);
  const lookAt = useSelectedStore((state) => state.lookAt);

  let dirt = useTexture(dirtText);
  let grass = useTexture(grassText);

  dirt.magFilter = THREE.NearestFilter;
  grass.magFilter = THREE.NearestFilter;

  const onMove = useCallback(
    (e) => {
      const camPos = camera.position;
      const intersectPos = e.object.parent.position;

      const xDist = Math.pow(camPos.x - intersectPos.x, 2);
      const yDist = Math.pow(camPos.y - intersectPos.y, 2);
      const zDist = Math.pow(camPos.z - intersectPos.z, 2);

      const dist = Math.sqrt(xDist + yDist + zDist);

      if (dist < 7 && lookAt === false) {
        e.stopPropagation();
        set(e.object);
      }
    },
    [lookAt]
  );
  const onOut = useCallback(() => set(null), []);
  const onClick = (e) => {
    e.stopPropagation();

    const camPos = camera.position;
    const intersectPos = e.object.parent.position;

    const xDist = Math.pow(camPos.x - intersectPos.x, 2);
    const yDist = Math.pow(camPos.y - intersectPos.y, 2);
    const zDist = Math.pow(camPos.z - intersectPos.z, 2);

    const dist = Math.sqrt(xDist + yDist + zDist);

    if (window.event.button === 0 && dist < 7) {
      const { x, y, z } = e.object.parent.position;

      const ind = cubes.findIndex((data) => {
        const [x2, y2, z2] = data.position;

        if (x2 === x && y2 === y && z2 === z) {
          return true;
        }
      });

      if (ind !== -1) {
        const cubeMem = cubes.slice();
        cubeMem.splice(ind, 1);
        setCubes(cubeMem);
      }
    } else if (window.event.button === 2 && dist < 7) {
      const { x, y, z } = ref.current.translation();
      const dir = [
        [x + 1, y, z],
        [x - 1, y, z],
        [x, y + 1, z],
        [x, y - 1, z],
        [x, y, z + 1],
        [x, y, z - 1],
      ];

      const newPos = dir[Math.floor(e.faceIndex / 2)];
      let texture;
      let color;
      let textName;

      if (!selected || selected === "1") {
        texture = dirt;
        color = "#7a5a05";
        textName = "dirt";
      } else if (selected === "2") {
        texture = grass;
        color = "#4e852a";
        textName = "grass";
      }

      const pkg = {
        position: newPos,
        texture: texture,
        color: color,
        textName: textName,
      };

      // Add code here
      addCube(pkg);
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
            map={props.map}
            color={hover ? "#820101" : props.col}
          />
        ))}
        <boxGeometry />
      </mesh>
    </RigidBody>
  );
}
