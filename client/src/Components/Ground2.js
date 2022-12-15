import React from 'react';
import { useState, useEffect, useRef, useCallbac, Fragment }from 'react';
import * as THREE from 'three';
import { Noise } from 'noisejs';
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useTexture, Edges, Instances, Instance } from "@react-three/drei"
import create from "zustand"
import grass from "../assets/grass.png"

export function Ground2() {

  const [blocks, setBlocks] = useState([]);
  // https://discourse.threejs.org/t/directly-remove-instancedmesh-instance/25504/2
  // oh boy..

  let blockLookup = new Map();
  let blockNeighborLookup = new Map();

  const ref = useRef();
  const texture = useTexture(grass);
  const faces = [
    {
      dir: [-1, 0, 0, "left"]
    },
    {
      dir: [1, 0, 0, "right"]
    },
    {
      dir: [0, -1, 0, "bottom"]
    },
    {
      dir: [0, 1, 0, "top"]
    },
    {
      dir: [0, 0, -1, "back"]
    },
    {
      dir: [0, 0, 1, "front"]
    },
  ]

  const materialArr = [

  ]




  useEffect(() => {

    function checkNeighbor(x, y, z) {
      const directions = [];
      for (const {dir} of faces) {
        let nX = x + dir[0];
        let nY = y + dir[1];
        let nZ = z + dir[2];
        const neighbor = checkVoxel(nX, nY, nZ);
        if(neighbor) {
          switch(dir[3]){
            case "right":
              directions.push("right");
              break;
            case "left":
              directions.push("left");
              break;
            case "bottom":
              directions.push("bottom");
              break;
            case "top":
              directions.push("top");
              break;
            case "back":
              directions.push("back");
              break;
            case "front":
              directions.push("front");
              break;
          }
        }
      }
  
      blockNeighborLookup.set(`${x} ${y} ${z}`, directions);
    }

    function checkVoxel(x, y, z) {
      return blockLookup.has(`${x} ${y} ${z}`);
    }


    const noise = new Noise(Math.random());
    let blockStore = [];
    let xOff = 0;
    let zOff = 0;
    let inc = 0.05;
    let amplitude = 50;
    for(let x = 0; x < 80; x++) {
      xOff = 0;
      for(let z = 0; z < 80; z++) {
        let y = Math.round(noise.perlin2(xOff, zOff) * amplitude / 5) + 3;
        blockLookup.set(`${x} ${y} ${z}`, [x,y,z]);
        blockNeighborLookup.set(`${x} ${y} ${z}`, []);
        blockStore.push([x, y, z])
        // Only create hollow shell to improve preformance, calc perimeter
        // blockStore.push([x, y - 1, z])
        // blockStore.push([x, y - 2, z])
        xOff = xOff + inc;
      } 
      zOff = zOff + inc;
    }
    
    blockStore.forEach(([x, y, z]) => {
      checkNeighbor(x, y, z);
    })

    setBlocks(blockStore);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  // {[...Array(6)].map((_, index) => (
  //  <meshStandardMaterial attach={`material-${index}`} key={index} map={texture} color={hover === index ? "hotpink" : "white"} />
  // ))}

  console.log(ref);
  //https://discourse.threejs.org/t/how-could-i-optimize-this-minecraft-js-code/32745
  return (
    <Instances ref={ref} limit={100000}>

          <boxGeometry/>
          <meshStandardMaterial/>
          {/* {[...Array(6)].map((_, index) => (
            <meshBasicMaterial attach={`material-${index}`} key={index} map={texture}/>
          ))} */}
          {blocks.map(([x,y,z], i) => (
            <Fragment key={i}>
              <Instance
                color = "red"
                castShadow
                receiveShadow
                key={i}
                position = {[x,y,z]}
              >
                <CuboidCollider args={[0.4, 0.4, 0.4]}/>
              </Instance>
            </Fragment>
          ))}
    </Instances>
  )

  // return (
  //   <>
  //   {blocks.map(([x,y,z], i) => (
  //     <RigidBody position={[x,y,z]} key={i} type="fixed" colliders="cuboid">
  //       <mesh position={[0, 0, 0]} receiveShadow castShadow>
  //         {/* <Edges /> */}
  //         <meshStandardMaterial color={0x00ff00}/>
  //         <boxGeometry args={[1,1,1]}/>
  //       </mesh>
  //     </RigidBody>
  //   ))}
  //   </>
  // )
}

// function Block() {
//   const ref = useRef();

// }