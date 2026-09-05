import { useState, useEffect, useRef, Fragment } from "react";
import { createNoise2D } from "simplex-noise";
import alea from "alea";
import { CuboidCollider } from "@react-three/rapier";
import { useTexture, Instances, Instance } from "@react-three/drei";
import { create } from "zustand";
import { useCubeStore } from "../Cube";
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
import { applyBlockTextureSettings } from "../../lib/blockTextures.ts";

// Global instancedMesh positions store
export const useInstanceStore = create((set) => ({
  positions: [],
  setPositions: (arr) => set((state) => ({ positions: arr })),
}));

// Component
export function Terrain() {
  // Texture for instances
  const texture = useTexture(grassText);

  // const cubes = useCubeStore((state) => state.cubes);

  // Stores
  const addCube = useCubeStore((state) => state.addCube);
  const selected = useSelectedStore((state) => state.selected);
  const setPositions = useInstanceStore((state) => state.setPositions);

  // States and refs
  const [blocks, setBlocks] = useState([]);
  const [size, setSize] = useState(100000);
  const ref = useRef();

  // Textures
  let dirt = useTexture(dirtText);
  let grass = useTexture(grassText);
  const glass = useTexture(glassText);
  const cobble = useTexture(cobbleText);
  const log = useTexture(logText);
  const planks = useTexture(planksText);
  const leaves = useTexture(leavesText);
  const stoneBricks = useTexture(stoneBricksText);
  const bricks = useTexture(bricksText);
  applyBlockTextureSettings(
    dirt, grass, glass, cobble, log, planks, leaves, stoneBricks, bricks,
  );

  // Terrain generation
  useEffect(() => {
    // noisejs has not been published since 2015 and seeds itself from a float
    // it cannot reproduce. alea is a seeded generator, so the same seed always
    // rebuilds the same terrain, which is what lets a saved world be stored as
    // a seed plus the blocks the player changed rather than every block.
    const seed = Math.floor(Math.random() * 2 ** 32);
    const noise2D = createNoise2D(alea(seed));

    // Settings for noise and array to push blocks to
    // let blockSet = new Set();
    let blockStore = [];
    let xOff = 0;
    let zOff = 0;
    let inc = 0.05;
    let amplitude = 35;

    // Loop through all possible positions
    for (let x = 0; x < 32; x++) {
      // xOffset - can potentially remove this: needs testing
      xOff = 0;
      for (let z = 0; z < 32; z++) {
        // Generate y values using perlin noise
        let y = Math.round((noise2D(xOff, zOff) * amplitude) / 5) + 4;
        blockStore.push([x, y, z]);
        // blockSet.add(`${x} ${y} ${z}`);

        // Only create hollow shell to improve preformance, calc perimeter
        if (x === 0 || x === 31) {
          for (let j = y; j > 0; j--) {
            blockStore.push([x, y - j, z]);
            // blockSet.add(`${x} ${y - j} ${z}`);
          }
        }

        if (z === 0 || z === 31) {
          for (let j = y; j > 0; j--) {
            blockStore.push([x, y - j, z]);
            // blockSet.add(`${x} ${y - j} ${z}`);
          }
        }
        blockStore.push([x, -1, z]);
        // blockSet.add(`${x} ${-1} ${z}`);

        // Increment xOffset
        xOff = xOff + inc;
      }
      // Increment zOffset
      zOff = zOff + inc;
    }

    // Update state
    setBlocks(blockStore);
    setSize(blockStore.length);
    setPositions(blockStore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handles both mouse buttons. React's onClick only ever fires for the primary
  // button, so the secondary button is wired to onContextMenu below and this
  // function branches on which button was used.
  const onClick = (e) => {
    e.stopPropagation();
    // Stop the browser's own context menu from opening on right-click.
    if (e.nativeEvent.button === 2) e.nativeEvent.preventDefault();

    // If left click
    if (e.nativeEvent.button === 0 && e.object.selected === true) {
      const clickedObj = e.object;
      const instancedMesh = ref.current;
      const instances = instancedMesh.children;
      const index = instances.indexOf(clickedObj);
      const { x, y, z } = e.object.position;

      // Find index of block clicked
      const ind = blocks.findIndex(([x2, y2, z2]) => {
        if (x2 === x && y2 === y && z2 === z) {
          return true;
        }
      });

      // Remove it from state and decrease the count of the instanced mesh
      if (ind !== -1) {
        let tempArr = blocks.slice();
        tempArr.splice(ind, 1);
        const el = instances.splice(index, 1);
        instances.push(el[0]);
        setBlocks(tempArr);
        setPositions(tempArr);
      }

      // If right click
    } else if (e.nativeEvent.button === 2 && e.object.selected === true) {
      const { x, y, z } = e.object.position;
      const dir = [
        [x + 1, y, z],
        [x - 1, y, z],
        [x, y + 1, z],
        [x, y - 1, z],
        [x, y, z + 1],
        [x, y, z - 1],
      ];

      // Add a new block to the cubes global store
      const newPos = dir[Math.floor(e.faceIndex / 2)];
      let color;
      let texture;
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

      // Package data
      const pkg = {
        position: newPos,
        texture: texture,
        color: color,
        textName: textName,
      };

      // Add the cube to store
      addCube(pkg);
    }
  };

  // Instanced mesh JSX
  return (
    <>
      {/* An InstancedMesh keeps the bounding sphere of its source geometry, a
          single 1x1x1 box at the origin, no matter where the instances are
          placed. The renderer therefore culls the whole terrain as soon as the
          origin leaves the view. Skipping the frustum test draws it reliably;
          the mesh is one draw call either way. */}
      <Instances ref={ref} limit={size} frustumCulled={false}>
        <boxGeometry />
        {[...Array(6)].map((_, index) => (
          <meshStandardMaterial
            attach={`material-${index}`}
            color={"#567d3c"}
            key={index}
            map={texture}
          />
        ))}

        {blocks.map(([x, y, z], i) => {
          return (
            <Fragment key={i}>
              <Instance
                onClick={onClick}
                onContextMenu={onClick}
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
