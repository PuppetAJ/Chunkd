import React from "react";
import * as THREE from "three";
import { useState, useEffect, useRef, Fragment } from "react";
import { Noise } from "noisejs";
import { useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useTexture, Instances, Instance } from "@react-three/drei";
import create from "zustand";
import grass from "../assets/grass.png";

export const useBlockStore = create((set) => ({
  blocks: new Set(),
  setBlocksSet: (newSet) => set((state) => ({ blocks: newSet })),
  // addBlock: (x, y, z) =>
  //   set((state) => ({ blocks: [...state.blocks, [x, y, z]] })),
}));

export function Ground2() {
  const texture = useTexture(grass);

  // const addBlock = useBlockStore((state) => state.addBlock);
  const setBlocksSet = useBlockStore((state) => state.setBlocksSet);

  const [blocks, setBlocks] = useState([]);
  const [size, setSize] = useState(100000);
  const ref = useRef();

  const { scene } = useThree();

  // https://discourse.threejs.org/t/directly-remove-instancedmesh-instance/25504/2
  // oh boy..

  useEffect(() => {
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
        let y = Math.round((noise.perlin2(xOff, zOff) * amplitude) / 5) + 1;
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
        blockStore.push([x, -1, z]);
        blockSet.add(`${x} ${-1} ${z}`);
        xOff = xOff + inc;
      }
      zOff = zOff + inc;
    }

    setBlocks(blockStore);
    setSize(blockStore.length);
    setBlocksSet(blockSet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = (e) => {
    console.log(scene);
    e.stopPropagation();

    const clickedObj = e.object;

    e.object.children = [];
    e.object.colliders = false;
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
  };

  return (
    <>
      <Instances ref={ref} limit={size}>
        <boxGeometry />
        {[...Array(6)].map((_, index) => (
          <meshStandardMaterial
            attach={`material-${index}`}
            key={index}
            map={texture}
          />
        ))}

        {blocks.map(([x, y, z], i) => {
          return (
            <Fragment key={i}>
              <Instance
                onClick={onClick}
                color="red"
                name="Terrain"
                castShadow
                receiveShadow
                position={[x, y, z]}
              >
                {/* <RigidBody type="fixed"></RigidBody> */}
                {/* <CuboidCollider
                  position={[0, 0, 0]}
                  type="fixed"
                  attach="mesh"
                  args={[0.5, 0.5, 0.5]}
                /> */}
              </Instance>
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

  // ===========================
  //   Unfinished feature code
  //     - Terrain Removal
  // ===========================
}
