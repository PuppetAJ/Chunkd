import React from "react";
import { useState, useEffect, useRef, Fragment } from "react";
import * as THREE from "three";
import { Noise } from "noisejs";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  InstancedRigidBodies,
  RigidBody,
} from "@react-three/rapier";
import { useTexture, Instances, Instance } from "@react-three/drei";
import create from "zustand";
import grass from "../assets/grass.png";

export function Ground2() {
  // Notes: Instanced mesh seems like the best approach for now
  // - I'm sure there's a way to cull unseen faces in between blocks but at the moment there isn't enough time to research that solution with instances
  // - Even rendering one face per block as separate instances, instancing outpreforms by miles with full blocks
  // - Perhaps merging the geometry would be a solution(?)
  // - Mentions of using a texture atlas to improve preformance

  // Onclick for each collision box
  // Function to find which collision box it is and then conditionally render them

  const [blocks, setBlocks] = useState([]);
  const [blocksMem, setBlocksMem] = useState([]);
  const [blocksMap, setBlocksMap] = useState(new Map());
  const [size, setSize] = useState(100000);
  const ref = useRef();
  const instanceRef = useRef();
  const { camera } = useThree();
  const collideRef = useRef();
  const [toggleColliders, setToggleColliders] = useState([]);
  // https://discourse.threejs.org/t/directly-remove-instancedmesh-instance/25504/2
  // oh boy..

  const testToggle = ([x, y, z]) => {
    // const ind = blocks.findIndex(([x2, y2, z2]) => {
    //   if (x2 === x && y2 === y && z2 === z) return true;
    // });
    // if (ind !== -1) {
    //   return true;
    // } else {
    //   return false;
    // }
    return blocksMap.get(`${x} ${y} ${z}`);
    // return toggleColliders[0];
  };

  const onClick = (e) => {
    // console.log(collideRef);
    console.log(ref);
    console.log(collideRef.current[0].colliderSet.map.data);
    console.log(collideRef.current[0]);
    // console.log(instanceRef);

    // console.log(collideRef.current[0]);
    e.stopPropagation();
    // setToggleColliders([false, true]);
    const clickedObj = e.object;
    const instancedMesh = ref.current;
    const instances = instancedMesh.children;
    const index = instances.indexOf(clickedObj);
    const { x, y, z } = e.object.position;
    // blocksMap.set(`${x} ${y} ${z}`, false);
    let tempMap = new Map(blocksMap);
    tempMap.delete(`${x} ${y} ${z}`);
    setBlocksMap(tempMap);
    // console.log(tempMap.get(`${x} ${y} ${z}`));
    // console.log(blocksMap.get(`${x} ${y} ${z}`));
    // console.log(blocksMap.get(`${x} ${y} ${z}`))

    const ind = blocks.findIndex(([x2, y2, z2]) => {
      if (x2 === x && y2 === y && z2 === z) {
        return true;
      }
    });

    const indMem = blocksMem.findIndex(([x2, y2, z2]) => {
      if (x2 === x && y2 === y && z2 === z) {
        return true;
      }
    });

    console.log(indMem);

    if (ind !== -1) {
      // let tempCollArr = toggleColliders.slice();
      // tempCollArr.splice(ind, 1);

      const collInd = indMem + 2;
      // collideRef.current[0].colliderSet.map.data[indMem] = null;
      // collideRef.current[0].colliderSet.map.data[2] = null;
      let tempArr = blocks.slice();
      tempArr.splice(ind, 1);
      const el = instances.splice(index, 1);
      instances.push(el[0]);
      // setSize(size - 1);
      setBlocks(tempArr);
      // setToggleColliders(tempCollArr);
    }
  };

  const texture = useTexture(grass);

  useFrame(() => {
    // console.log(camera.position);
    // console.log(ref);
    const { x, y, z } = camera.position;
    const key = `${Math.floor(x)} ${Math.floor(y)} ${Math.floor(z)}`;
    if (blocksMap.has(key)) {
      console.log("bruh");
      // camera.position.set(...[0, 0, 0]);
    }
  });

  useEffect(() => {
    const noise = new Noise(Math.random());
    let blockMap = new Map();
    let blockStore = [];
    let xOff = 0;
    let zOff = 0;
    let inc = 0.05;
    let amplitude = 35;
    for (let x = 0; x < 2; x++) {
      xOff = 0;
      for (let z = 0; z < 2; z++) {
        let y = Math.round((noise.perlin2(xOff, zOff) * amplitude) / 5) + 2;
        blockStore.push([x, y, z]);
        blockMap.set(`${x} ${y} ${z}`, true);
        // Only create hollow shell to improve preformance, calc perimeter
        // if (x === 0 || x === 31) {
        //   for (let j = y; j > 0; j--) {
        //     blockStore.push([x, y - j, z]);
        //     blockMap.set(`${x} ${y - j} ${z}`, true);
        //   }
        // }

        // if (z === 0 || z === 31) {
        //   for (let j = y; j > 0; j--) {
        //     blockStore.push([x, y - j, z]);
        //     blockMap.set(`${x} ${y - j} ${z}`, true);
        //   }
        // }
        // blockStore.push([x, -1, z]);
        blockMap.set(`${x} ${-1} ${z}`, true);
        xOff = xOff + inc;
      }
      zOff = zOff + inc;
    }

    setBlocks(blockStore);
    setBlocksMem(blockStore);
    setBlocksMap(blockMap);
    setSize(blockStore.length);

    let colliders = [];
    blockStore.forEach((el, i) => {
      colliders.push(true);
    });

    setToggleColliders(colliders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // return (
  //   <InstancedRigidBodies positions={blocks}>
  //     <instancedMesh args={[undefined, undefined, 2]}>
  //       <boxGeometry />
  //       <meshBasicMaterial color="blue" />

  //       <CuboidCollider args={[0.5, 0.5, 0.5]} />
  //     </instancedMesh>
  //   </InstancedRigidBodies>
  // );

  // console.log(collideRef);
  return (
    // <InstancedRigidBodies ref={ref} colliders="cuboid">
    <Instances ref={ref} limit={size}>
      <boxGeometry />
      {/* <meshStandardMaterial/> */}
      {[...Array(6)].map((_, index) => (
        <meshStandardMaterial
          attach={`material-${index}`}
          key={index}
          map={texture}
        />
      ))}
      {/* <InstancedRigidBodies collider="cuboid"> */}

      {blocks.map(([x, y, z], i) => {
        return (
          <Fragment key={i}>
            <Instance
              ref={instanceRef}
              // onClick={onClick}
              color="red"
              name="Terrain"
              castShadow
              receiveShadow
              position={[x, y, z]}
            >
              {true && (
                <CuboidCollider
                  position={[0, 0, 0]}
                  ref={collideRef}
                  attach="mesh"
                  args={[0.5, 0.5, 0.5]}
                />
              )}
            </Instance>
          </Fragment>
        );
      })}
      {/* </InstancedRigidBodies> */}
    </Instances>
    // </InstancedRigidBodies>
  );
}

const COUNT = 2;

const Scene = () => {
  const instancedApi = useRef(null);
  const positions = [
    [3, 0, 0],
    [3, 2, 0],
  ];

  return (
    <InstancedRigidBodies
      ref={instancedApi}
      positions={positions}
      colliders="ball"
    >
      <instancedMesh args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color="blue" />

        <CuboidCollider args={[0.1, 0.2, 0.1]} />
      </instancedMesh>
    </InstancedRigidBodies>
  );
};
