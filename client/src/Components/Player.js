import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useBlockStore } from "./Ground2";
import Axe from "./Axe";

const SPEED = 5;
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const rotation = new THREE.Vector3();

const oldPos = new THREE.Vector3();
const oldCamPos = new THREE.Vector3();

export function Player({ lerp = THREE.MathUtils.lerp }) {
  const axe = useRef();
  const ref = useRef();
  const collideRef = useRef();
  const rapier = useRapier();
  const { camera, scene } = useThree();
  const [, get] = useKeyboardControls();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // oldPos.copy(ref.current.translation());
  // console.log(oldPos);
  // oldCamPos.copy(camera.position);

  const down = new THREE.Raycaster();

  let xWall = false;
  let zWall = false;
  // relative coords in names!

  // posX rays
  // const pX1 = new THREE.Raycaster();
  const pX2 = new THREE.Raycaster();
  // const pX3 = new THREE.Raycaster();
  const pX4 = new THREE.Raycaster();

  // negX rays
  // const nX1 = new THREE.Raycaster();
  const nX2 = new THREE.Raycaster();
  // const nX3 = new THREE.Raycaster();
  const nX4 = new THREE.Raycaster();

  // posZ rays
  // const pZ1 = new THREE.Raycaster();
  const pZ2 = new THREE.Raycaster();
  // const pZ3 = new THREE.Raycaster();
  const pZ4 = new THREE.Raycaster();

  // negZ rays
  // const nZ1 = new THREE.Raycaster();
  const nZ2 = new THREE.Raycaster();
  // const nZ3 = new THREE.Raycaster();
  const nZ4 = new THREE.Raycaster();

  let objMem = "";

  const blocks = useBlockStore((state) => state.blocks);

  function testColl(payload) {
    // console.log(payload);
  }

  useFrame((state) => {
    //console.log(ref);
    //console.log(collideRef);
    let { forward, backward, left, right, jump } = get();
    const velocity = ref.current.linvel();
    const { x, y, z } = ref.current.translation();
    const pos = ref.current.translation();

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);

    let groundCheck = false;
    let wallCheck = false;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length) {
      const camPos = camera.position;
      const intersectPos = intersects[0].object.position;

      const xDist = Math.pow(camPos.x - intersectPos.x, 2);
      const yDist = Math.pow(camPos.y - intersectPos.y, 2);
      const zDist = Math.pow(camPos.z - intersectPos.z, 2);

      const dist = Math.sqrt(xDist + yDist + zDist);

      if (
        intersects[0].object.name === "Terrain" &&
        intersects[0].object.id !== objMem.id &&
        dist <= 7
      ) {
        // console.log(intersects[0]);
        if (objMem !== "") {
          const oldColor = objMem.color;
          oldColor["r"] = 1;
          oldColor["b"] = 0;
          oldColor["g"] = 0;
        }
        objMem = intersects[0].object;
        // console.log("hi");
        // console.log(intersects[0]);
        const color = intersects[0].object.color;
        color["r"] = 0;
        color["b"] = 0;
        color["g"] = 3;
        // console.log(intersects[0].object.color);
      }

      if (intersects[0].object.id !== objMem.id || dist > 7) {
        if (objMem !== "") {
          const oldColor = objMem.color;
          oldColor["r"] = 1;
          oldColor["b"] = 0;
          oldColor["g"] = 0;
          objMem = "";
        }
      }
    }

    // Collision detection
    const downCheck = new THREE.Vector3(0, -1, 0);
    down.set(camera.position, downCheck);

    const downInt = down.intersectObjects(scene.children);

    if (downInt.length && downInt[0].object.name === "Terrain") {
      const currPos = ref.current.translation();
      const intPos = downInt[0].object.position;
      if (currPos.y <= intPos.y + 1) {
        groundCheck = true;
      }
    }

    // if (true) {
    //   // Positive X Checks
    //   const posXDir = new THREE.Vector3(1, 0, 0);

    //   // const pX1CheckOrigin = new THREE.Vector3(x, y, z );
    //   const pX2CheckOrigin = new THREE.Vector3(x, y, z);
    //   // const pX3CheckOrigin = new THREE.Vector3(x, y + 1, z );
    //   const px4CheckOrigin = new THREE.Vector3(x, y + 1, z);

    //   // pX1.set(pX1CheckOrigin, posXDir);
    //   pX2.set(pX2CheckOrigin, posXDir);
    //   // pX3.set(pX3CheckOrigin, posXDir);
    //   pX4.set(px4CheckOrigin, posXDir);

    //   // const pX1Int = pX1.intersectObjects(scene.children);
    //   const pX2Int = pX2.intersectObjects(scene.children);
    //   // const pX3Int = pX3.intersectObjects(scene.children);
    //   const pX4Int = pX4.intersectObjects(scene.children);

    //   // if (pX1Int.length && pX1Int[0].object.name === "Terrain") {
    //   //   const currPos = ref.current.translation();
    //   //   const intPos = pX1Int[0].object.position;
    //   //   const mxDist = Math.abs(currPos.x - intPos.x);

    //   //   if (mxDist <= 0.6) {
    //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //   //     ref.current.setTranslation({ x: intPos.x - 0.6, y: y, z: z });
    //   //     wallCheck = true;
    //   //     camera.position.set(...[intPos.x - 0.6, camera.position.y, z]);
    //   //   }
    //   // }

    //   if (pX2Int.length && pX2Int[0].object.name === "Terrain") {
    //     const currPos = ref.current.translation();
    //     const intPos = pX2Int[0].object.position;
    //     const mxDist = Math.abs(currPos.x - intPos.x);

    //     if (mxDist <= 0.6) {
    //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //       // ref.current.setTranslation({ x: intPos.x - 0.6, y: y, z: z });
    //       ref.current.setTranslation(oldPos);
    //       wallCheck = true;
    //       xWall = true;
    //       camera.position.set(oldCamPos);
    //       // camera.position.set(...[intPos.x - 0.6, camera.position.y, z]);
    //     }
    //   }

    //   // if (pX3Int.length && pX3Int[0].object.name === "Terrain") {
    //   //   const currPos = ref.current.translation();
    //   //   const intPos = pX3Int[0].object.position;
    //   //   const mxDist = Math.abs(currPos.x - intPos.x);

    //   //   if (mxDist <= 0.6) {
    //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //   //     ref.current.setTranslation({ x: intPos.x - 0.6, y: y, z: z });
    //   //     wallCheck = true;
    //   //     camera.position.set(...[intPos.x - 0.6, camera.position.y, z]);
    //   //   }
    //   // }

    //   if (pX4Int.length && pX4Int[0].object.name === "Terrain") {
    //     const currPos = ref.current.translation();
    //     const intPos = pX4Int[0].object.position;
    //     const mxDist = Math.abs(currPos.x - intPos.x);

    //     if (mxDist <= 0.6) {
    //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //       // ref.current.setTranslation({ x: intPos.x - 0.6, y: y, z: z });
    //       ref.current.setTranslation(oldPos);
    //       wallCheck = true;
    //       xWall = true;
    //       // camera.position.set(...[intPos.x - 0.6, camera.position.y, z]);
    //       camera.position.set(oldCamPos);
    //     }
    //   }

    //   // Negative X Checks
    //   const negXDir = new THREE.Vector3(-1, 0, 0);

    //   // const nX1CheckOrigin = new THREE.Vector3(x, y, z);
    //   const nX2CheckOrigin = new THREE.Vector3(x, y, z);
    //   // const nX3CheckOrigin = new THREE.Vector3(x, y + 1, z);
    //   const nX4CheckOrigin = new THREE.Vector3(x, y + 1, z);

    //   // nX1.set(nX1CheckOrigin, negXDir);
    //   nX2.set(nX2CheckOrigin, negXDir);
    //   // nX3.set(nX3CheckOrigin, negXDir);
    //   nX4.set(nX4CheckOrigin, negXDir);

    //   // const nX1Int = nX1.intersectObjects(scene.children);
    //   const nX2Int = nX2.intersectObjects(scene.children);
    //   // const nX3Int = nX3.intersectObjects(scene.children);
    //   const nX4Int = nX4.intersectObjects(scene.children);

    //   // if (nX1Int.length && nX1Int[0].object.name === "Terrain") {
    //   //   // console.log("Hello");
    //   //   const currPos = ref.current.translation();
    //   //   const intPos = nX1Int[0].object.position;
    //   //   const mxDist = Math.abs(currPos.x - intPos.x);

    //   //   if (mxDist <= 0.6) {
    //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //   //     ref.current.setTranslation({ x: intPos.x + 0.6, y: y, z: z });
    //   //     wallCheck = true;
    //   //     camera.position.set(...[intPos.x + 0.6, camera.position.y, z]);
    //   //   }
    //   // }

    //   if (nX2Int.length && nX2Int[0].object.name === "Terrain") {
    //     const currPos = ref.current.translation();
    //     const intPos = nX2Int[0].object.position;
    //     const mxDist = Math.abs(currPos.x - intPos.x);

    //     if (mxDist <= 0.6) {
    //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //       // ref.current.setTranslation({ x: intPos.x + 0.6, y: y, z: z });
    //       ref.current.setTranslation(oldPos);
    //       wallCheck = true;
    //       xWall = true;
    //       camera.position.set(oldCamPos);
    //       // camera.position.set(...[intPos.x + 0.6, camera.position.y, z]);
    //     }
    //   }

    //   // if (nX3Int.length && nX3Int[0].object.name === "Terrain") {
    //   //   const currPos = ref.current.translation();
    //   //   const intPos = nX3Int[0].object.position;
    //   //   const mxDist = Math.abs(currPos.x - intPos.x);

    //   //   if (mxDist <= 0.6) {
    //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //   //     ref.current.setTranslation({ x: intPos.x + 0.6, y: y, z: z });
    //   //     wallCheck = true;
    //   //     camera.position.set(...[intPos.x + 0.6, camera.position.y, z]);
    //   //   }
    //   // }

    //   if (nX4Int.length && nX4Int[0].object.name === "Terrain") {
    //     const currPos = ref.current.translation();
    //     const intPos = nX4Int[0].object.position;
    //     const mxDist = Math.abs(currPos.x - intPos.x);

    //     if (mxDist <= 0.6) {
    //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    //       // ref.current.setTranslation({ x: intPos.x + 0.6, y: y, z: z });
    //       ref.current.setTranslation(oldPos);
    //       wallCheck = true;
    //       xWall = true;
    //       camera.position.set(oldCamPos);
    //       // camera.position.set(...[intPos.x + 0.6, camera.position.y, z]);
    //     }
    //   }
    // }

    // // if (true) {
    // //   // Positive Z checks
    // //   const posZDir = new THREE.Vector3(0, 0, 1);

    // //   // const nZ1CheckOrigin = new THREE.Vector3(x + 0.15, y, z);
    // //   const nZ2CheckOrigin = new THREE.Vector3(x, y, z);
    // //   // const nZ3CheckOrigin = new THREE.Vector3(x, y + 1, z);
    // //   const nZ4CheckOrigin = new THREE.Vector3(x, y + 1, z);

    // //   // nZ1.set(nZ1CheckOrigin, posZDir);
    // //   nZ2.set(nZ2CheckOrigin, posZDir);
    // //   // nZ3.set(nZ3CheckOrigin, posZDir);
    // //   nZ4.set(nZ4CheckOrigin, posZDir);

    // //   // const nZ1Int = nZ1.intersectObjects(scene.children);
    // //   const nZ2Int = nZ2.intersectObjects(scene.children);
    // //   // const nZ3Int = nZ3.intersectObjects(scene.children);
    // //   const nZ4Int = nZ4.intersectObjects(scene.children);

    // //   // if (nZ1Int.length && nZ1Int[0].object.name === "Terrain") {
    // //   //   const currPos = ref.current.translation();
    // //   //   const intPos = nZ1Int[0].object.position;
    // //   //   const mzDist = Math.abs(currPos.z - intPos.z);

    // //   //   if (mzDist <= 0.6) {
    // //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //   //     ref.current.setTranslation({ x: x, y: y, z: intPos.z - 0.6 });
    // //   //     wallCheck = true;
    // //   //     camera.position.set(...[x, camera.position.y, intPos.z - 0.6]);
    // //   //   }
    // //   // }

    // //   if (nZ2Int.length && nZ2Int[0].object.name === "Terrain") {
    // //     const currPos = ref.current.translation();
    // //     const intPos = nZ2Int[0].object.position;
    // //     const mzDist = Math.abs(currPos.z - intPos.z);

    // //     if (mzDist <= 0.6) {
    // //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //       ref.current.setTranslation({ x: x, y: y, z: intPos.z - 0.6 });
    // //       wallCheck = true;
    // //       zWall = true;
    // //       camera.position.set(...[x, camera.position.y, intPos.z - 0.6]);
    // //     }
    // //   }

    // //   // if (nZ3Int.length && nZ3Int[0].object.name === "Terrain") {
    // //   //   const currPos = ref.current.translation();
    // //   //   const intPos = nZ3Int[0].object.position;
    // //   //   const mzDist = Math.abs(currPos.z - intPos.z);

    // //   //   if (mzDist <= 0.6) {
    // //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //   //     ref.current.setTranslation({ x: x, y: y, z: intPos.z - 0.6 });
    // //   //     wallCheck = true;
    // //   //     camera.position.set(...[x, camera.position.y, intPos.z - 0.6]);
    // //   //   }
    // //   // }

    // //   if (nZ4Int.length && nZ4Int[0].object.name === "Terrain") {
    // //     const currPos = ref.current.translation();
    // //     const intPos = nZ4Int[0].object.position;
    // //     const mzDist = Math.abs(currPos.z - intPos.z);

    // //     if (mzDist <= 0.6) {
    // //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //       ref.current.setTranslation({ x: x, y: y, z: intPos.z - 0.6 });
    // //       wallCheck = true;
    // //       zWall = true;
    // //       camera.position.set(...[x, camera.position.y, intPos.z - 0.6]);
    // //     }
    // //   }

    // //   // // Negative Z checks
    // //   const negZDir = new THREE.Vector3(0, 0, -1);

    // //   // const pZ1CheckOrigin = new THREE.Vector3(x, y, z);
    // //   const pZ2CheckOrigin = new THREE.Vector3(x, y, z);
    // //   // const pZ3CheckOrigin = new THREE.Vector3(x, y + 1, z);
    // //   const pZ4CheckOrigin = new THREE.Vector3(x, y + 1, z);

    // //   // pZ1.set(pZ1CheckOrigin, negZDir);
    // //   pZ2.set(pZ2CheckOrigin, negZDir);
    // //   // pZ3.set(pZ3CheckOrigin, negZDir);
    // //   pZ4.set(pZ4CheckOrigin, negZDir);

    // //   // const pZ1Int = pZ1.intersectObjects(scene.children);
    // //   const pZ2Int = pZ2.intersectObjects(scene.children);
    // //   // const pZ3Int = pZ3.intersectObjects(scene.children);
    // //   const pZ4Int = pZ4.intersectObjects(scene.children);

    // //   // if (pZ1Int.length && pZ1Int[0].object.name === "Terrain") {
    // //   //   const currPos = ref.current.translation();
    // //   //   const intPos = pZ1Int[0].object.position;
    // //   //   const mzDist = Math.abs(currPos.z - intPos.z);

    // //   //   if (mzDist <= 0.6) {
    // //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //   //     ref.current.setTranslation({ x: x, y: y, z: intPos.z + 0.6 });
    // //   //     wallCheck = true;
    // //   //     camera.position.set(...[x, camera.position.y, intPos.z + 0.6]);
    // //   //   }
    // //   // }

    // //   if (pZ2Int.length && pZ2Int[0].object.name === "Terrain") {
    // //     const currPos = ref.current.translation();
    // //     const intPos = pZ2Int[0].object.position;
    // //     const mzDist = Math.abs(currPos.z - intPos.z);

    // //     if (mzDist <= 0.6) {
    // //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //       ref.current.setTranslation({ x: x, y: y, z: intPos.z + 0.6 });
    // //       wallCheck = true;
    // //       zWall = true;
    // //       camera.position.set(...[x, camera.position.y, intPos.z + 0.6]);
    // //     }
    // //   }

    // //   // if (pZ3Int.length && pZ3Int[0].object.name === "Terrain") {
    // //   //   const currPos = ref.current.translation();
    // //   //   const intPos = pZ3Int[0].object.position;
    // //   //   const mzDist = Math.abs(currPos.z - intPos.z);

    // //   //   if (mzDist <= 0.6) {
    // //   //     ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //   //     ref.current.setTranslation({ x: x, y: y, z: intPos.z + 0.6 });
    // //   //     wallCheck = true;
    // //   //     camera.position.set(...[x, camera.position.y, intPos.z + 0.6]);
    // //   //   }
    // //   // }

    // //   if (pZ4Int.length && pZ4Int[0].object.name === "Terrain") {
    // //     const currPos = ref.current.translation();
    // //     const intPos = pZ4Int[0].object.position;
    // //     const mzDist = Math.abs(currPos.z - intPos.z);

    // //     if (mzDist <= 0.6) {
    // //       ref.current.setLinvel({ x: 0, y: velocity.y, z: 0 });
    // //       ref.current.setTranslation({ x: x, y: y, z: intPos.z + 0.6 });
    // //       wallCheck = true;
    // //       zWall = true;
    // //       camera.position.set(...[x, camera.position.y, intPos.z + 0.6]);
    // //     }
    // //   }
    // // }

    // update camera
    if (!wallCheck) {
      camera.position.set(...[x, y + 0.8, z]);
    }

    oldPos.copy(pos);
    oldCamPos.copy(camera.position);

    // update axe
    axe.current.children[0].rotation.x = lerp(
      axe.current.children[0].rotation.x,
      Math.sin((velocity.length() > 1) * state.clock.elapsedTime * 10) / 6,
      0.1
    );

    axe.current.rotation.copy(camera.rotation);
    axe.current.position
      .copy(camera.position)
      .add(camera.getWorldDirection(rotation).multiplyScalar(1));

    // movement
    frontVector.set(0, 0, backward - forward);
    sideVector.set(left - right, 0, 0);

    // This is the code that's breaking the movement !!!!!!!!
    // looking down or up causes you to stop moving

    if (!groundCheck) {
      ref.current.setLinvel({
        x: direction.x,
        y: velocity.y - 0.5,
        z: direction.z,
      });
    } else {
      ref.current.setLinvel({ x: direction.x, y: 0, z: direction.z });
    }

    // jumping
    const world = rapier.world.raw();
    const ray = world.castRay(
      new RAPIER.Ray(ref.current.translation(), { x: 0, y: -1, z: 0 })
    );
    const grounded = ray && ray.collider && Math.abs(ray.toi) <= 1;
    if (jump && grounded) ref.current.setLinvel({ x: 0, y: 8, z: 0 });
    if (jump && groundCheck) ref.current.setLinvel({ x: 0, y: 8, z: 0 });
  });

  return (
    <>
      <RigidBody
        ref={ref}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 20, 0]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider
          onCollisionEnter={testColl}
          ref={collideRef}
          args={[0.3, 0.3]}
        />
      </RigidBody>
      <group
        ref={axe}
        onPointerMissed={(e) => (axe.current.children[0].rotation.x = -0.5)}
      >
        <Axe position={[0.3, -0.35, 0.5]} />
      </group>
    </>
  );
}
