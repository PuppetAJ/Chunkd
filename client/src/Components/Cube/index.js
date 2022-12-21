import { useCallback, useEffect, useRef, useState } from "react";
import { useTexture } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree, useFrame } from "@react-three/fiber";
import create from "zustand";
import * as THREE from "three";
import { useSelectedStore } from "../Player";
import dirtText from "../../assets/textures/dirt.png";
import grassText from "../../assets/textures/grass.png";
import glassText from "../../assets/textures/glass.png";
import cobbleText from "../../assets/textures/cobblestone.png";
import logText from "../../assets/textures/log.png";
import planksText from "../../assets/textures/planks.png";
import leavesText from "../../assets/textures/leaves.png";
import stoneBricksText from "../../assets/textures/stone_bricks.png";
import bricksText from "../../assets/textures/bricks.png";

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

  const dirt = useTexture(dirtText);
  const grass = useTexture(grassText);
  const glass = useTexture(glassText);
  const cobble = useTexture(cobbleText);
  const log = useTexture(logText);
  const planks = useTexture(planksText);
  const leaves = useTexture(leavesText);
  const stoneBricks = useTexture(stoneBricksText);
  const bricks = useTexture(bricksText);

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
        color = "#567d3c";
        textName = "grass";
      } else if (selected === "3") {
        texture = glass;
        color = "#613c00";
        textName = "glass";
      } else if (selected === "4") {
        texture = cobble;
        color = "#737373";
        textName = "cobble";
      } else if (selected === "5") {
        texture = log;
        color = "#6b542e";
        textName = "log";
      } else if (selected === "6") {
        texture = planks;
        color = "#856738";
        textName = "planks";
      } else if (selected === "7") {
        texture = leaves;
        color = "#344d2c";
        textName = "leaves";
      } else if (selected === "8") {
        texture = bricks;
        color = "#8c5d50";
        textName = "bricks";
      } else if (selected === "9") {
        texture = stoneBricks;
        color = "#737373";
        textName = "stonebricks";
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
            transparent
            color={hover ? "#820101" : props.col}
          />
        ))}
        <boxGeometry />
      </mesh>
    </RigidBody>
  );
}
