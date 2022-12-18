import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import Axe from "./Axe";

const SPEED = 5;
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const rotation = new THREE.Vector3();

export function Player({ lerp = THREE.MathUtils.lerp }) {
  const axe = useRef();
  const ref = useRef();
  const rapier = useRapier();
  const { camera, scene } = useThree();
  const [, get] = useKeyboardControls();
  const raycaster = new THREE.Raycaster();

  useFrame((state) => {
    // const direction2 = new THREE.Vector3(0, -1, 0);
    // raycaster.set(camera.position, direction2);

    // const intersects = raycaster.intersectObjects(scene.children);
    // // console.log(intersects);

    // if (intersects[0].object.name === "Terrain") {
    //   // const test = ref.current.linvel;
    //   const test = intersects[0].object.position;
    //   const linVel = ref.current.linvel();
    //   const cameraPos = camera.position;
    //   console.log(test.y);
    //   ref.current.setTranslation({
    //     x: cameraPos.x,
    //     y: test.y,
    //     z: cameraPos.z,
    //   });
    //   ref.current.setLinvel({
    //     x: linVel.x,
    //     y: 0,
    //     z: linVel.z,
    //   });
    // }

    const { forward, backward, left, right, jump } = get();
    const velocity = ref.current.linvel();
    // update camera
    const { x, y, z } = ref.current.translation();
    camera.position.set(...[x, y + 0.8, z]);

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
    // https://threejs.org/docs/#api/en/cameras/Camera
    // console.log(camera.rotation);
    // const {_x, _y, _z} = camera.rotation;
    // console.log(camera.rotation);
    // const cameraRot = new THREE.Euler(_x, _y, _z);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);
    ref.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z });
    // jumping
    const world = rapier.world.raw();
    const ray = world.castRay(
      new RAPIER.Ray(ref.current.translation(), { x: 0, y: -1, z: 0 })
    );
    const grounded = ray && ray.collider && Math.abs(ray.toi) <= 1;
    if (jump && grounded) ref.current.setLinvel({ x: 0, y: 8, z: 0 });
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
        <CapsuleCollider args={[0.3, 0.3]} />
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
