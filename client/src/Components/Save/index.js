import { useState } from "react";

import { useTexture, Instances, Instance } from "@react-three/drei";
import dirtText from "../../assets/textures/dirt.png";
import grassText from "../../assets/textures/grass.png";
import glassText from "../../assets/textures/glass.png";
import cobbleText from "../../assets/textures/cobblestone.png";
import logText from "../../assets/textures/log.png";
import planksText from "../../assets/textures/planks.png";
import leavesText from "../../assets/textures/leaves.png";
import stoneBricksText from "../../assets/textures/stone_bricks.png";
import bricksText from "../../assets/textures/bricks.png";

export function Save(props) {
  // Parse data
  const build = JSON.parse(props.build);

  // Instanced mesh and player placed cube positions
  const [instancePos] = useState(build.instanceBlocks);
  const [cubePos] = useState(build.cubes);

  // Textures
  const dirt = useTexture(dirtText);
  const grass = useTexture(grassText);
  const glass = useTexture(glassText);
  const cobble = useTexture(cobbleText);
  const log = useTexture(logText);
  const planks = useTexture(planksText);
  const leaves = useTexture(leavesText);
  const stoneBricks = useTexture(stoneBricksText);
  const bricks = useTexture(bricksText);

  // Select texture to apply
  const textureSelect = (name) => {
    if (name === "dirt") {
      return dirt;
    } else if (name === "grass") {
      return grass;
    } else if (name === "glass") {
      return glass;
    } else if (name === "cobble") {
      return cobble;
    } else if (name === "log") {
      return log;
    } else if (name === "planks") {
      return planks;
    } else if (name === "leaves") {
      return leaves;
    } else if (name === "stonebricks") {
      return stoneBricks;
    } else if (name === "bricks") {
      return bricks;
    }
  };

  // JSX -- simply maps an intanced mesh and separate meshes to the positions stored

  return (
    <>
      <Instances position={[-16, 0, -16]} limit={100000}>
        <boxGeometry />
        {[...Array(6)].map((_, index) => (
          <meshStandardMaterial
            attach={`material-${index}`}
            color={"#4e852a"}
            key={index}
            map={grass}
          />
        ))}

        {instancePos.map(([x, y, z], i) => {
          return (
            <Instance
              key={i}
              name="Terrain"
              castShadow
              receiveShadow
              position={[x, y, z]}
            />
          );
        })}
      </Instances>
      {cubePos.map((el, i) => {
        const [x, y, z] = el.position;
        return (
          <mesh
            key={i}
            position={[x + -16, y, z + -16]}
            receiveShadow
            castShadow
          >
            {[...Array(6)].map((_, index) => (
              <meshStandardMaterial
                attach={`material-${index}`}
                key={index}
                transparent
                map={textureSelect(el.textName)}
                color={el.color}
              />
            ))}
            <boxGeometry />
          </mesh>
        );
      })}
    </>
  );
}
