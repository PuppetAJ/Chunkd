import { useEffect, useState } from "react";

import { useTexture, Instances, Instance } from "@react-three/drei";
import dirtText from "../../assets/textures/dirt.png";
import grassText from "../../assets/textures/grass.png";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function Save(props) {
  const build = JSON.parse(props.build);

  const [instancePos] = useState(build.instanceBlocks);
  const [cubePos] = useState(build.cubes);

  // console.log(build);

  const dirt = useTexture(dirtText);
  const grass = useTexture(grassText);

  const textureSelect = (name) => {
    if (name === "dirt") {
      return dirt;
    } else if (name === "grass") {
      return grass;
    }
  };

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
