import React from "react";
import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { Noise } from "noisejs";
import { CuboidCollider } from "@react-three/rapier";
import { useTexture, Instances, Instance } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import create from "zustand";
import grass from "../../assets/textures/grass.png";
import { useCubeStore } from "../Cube";

export function Terrain() {
  const texture = useTexture(grass);

  const cubes = useCubeStore((state) => state.cubes);
  const addCube = useCubeStore((state) => state.addCube);

  const [blocks, setBlocks] = useState([]);
  const [size, setSize] = useState(100000);
  const ref = useRef();

  const { camera } = useThree();

  // https://discourse.threejs.org/t/directly-remove-instancedmesh-instance/25504/2
  // oh boy..

  useEffect(() => {
    // Note: terrain gen bug where multiple instances potentially lap (?)
    const noise = new Noise(Math.random());
    let blockSet = new Set();
    let blockStore = [];
    let xOff = 0;
    let zOff = 0;
    let inc = 0.05;
    let amplitude = 35;
    for (let x = 0; x < 32; x++) {
      xOff = 0;
      for (let z = 0; z < 32; z++) {
        let y = Math.round((noise.perlin2(xOff, zOff) * amplitude) / 5) + 4;
        blockStore.push([x, y, z]);
        blockSet.add(`${x} ${y} ${z}`);

        // Only create hollow shell to improve preformance, calc perimeter
        if (x === 0 || x === 31) {
          for (let j = y; j > 0; j--) {
            blockStore.push([x, y - j, z]);
            blockSet.add(`${x} ${y - j} ${z}`);
          }
        }

        if (z === 0 || z === 31) {
          for (let j = y; j > 0; j--) {
            blockStore.push([x, y - j, z]);
            blockSet.add(`${x} ${y - j} ${z}`);
          }
        }
        // blockStore.push([x, 0, z]);
        blockSet.add(`${x} ${-1} ${z}`);
        xOff = xOff + inc;
      }
      zOff = zOff + inc;
    }

    setBlocks(blockStore);
    setSize(blockStore.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = (e) => {
    e.stopPropagation();

    const intersectPos = e.object.position;
    const camPos = camera.position;

    const xDist = Math.pow(camPos.x - intersectPos.x, 2);
    const yDist = Math.pow(camPos.y - intersectPos.y, 2);
    const zDist = Math.pow(camPos.z - intersectPos.z, 2);

    const dist = Math.sqrt(xDist + yDist + zDist);

    if (window.event.button === 0 && e.object.selected === true) {
      const clickedObj = e.object;
      const instancedMesh = ref.current;
      const instances = instancedMesh.children;
      const index = instances.indexOf(clickedObj);
      const { x, y, z } = e.object.position;

      const ind = blocks.findIndex(([x2, y2, z2]) => {
        if (x2 === x && y2 === y && z2 === z) {
          return true;
        }
      });

      if (ind !== -1) {
        let tempArr = blocks.slice();
        tempArr.splice(ind, 1);
        const el = instances.splice(index, 1);
        instances.push(el[0]);
        setBlocks(tempArr);
      }
    } else if (window.event.button === 2 && e.object.selected === true) {
      const { x, y, z } = e.object.position;
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
    <>
      <Instances ref={ref} limit={size}>
        <boxGeometry />
        {[...Array(6)].map((_, index) => (
          <meshStandardMaterial
            attach={`material-${index}`}
            color={"#4e852a"}
            key={index}
            map={texture}
          />
        ))}

        {blocks.map(([x, y, z], i) => {
          return (
            <Fragment key={i}>
              <Instance
                onClick={onClick}
                name="Terrain"
                castShadow
                receiveShadow
                position={[x, y, z]}
              ></Instance>
            </Fragment>
          );
        })}
      </Instances>
      {blocks.map(([x, y, z], i) => {
        return (
          <CuboidCollider
            key={i}
            position={[x, y, z]}
            args={[0.5, 0.5, 0.5]}
          ></CuboidCollider>
        );
      })}
    </>
  );
}
