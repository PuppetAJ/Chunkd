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

export function Player({ lerp = THREE.MathUtils.lerp }) {
  const axe = useRef();
  const ref = useRef();
  const rapier = useRapier();
  const { camera } = useThree();
  const [, get] = useKeyboardControls();

  const blocks = useBlockStore((state) => state.blocks);

  useFrame((state) => {
    let { forward, backward, left, right, jump } = get();
    const velocity = ref.current.linvel();
    const { x, y, z } = ref.current.translation();

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);

    // update camera
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

    ref.current.setLinvel({
      x: direction.x,
      y: velocity.y - 0.5,
      z: direction.z,
    });

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
