import * as THREE from "three"
import { useTexture } from "@react-three/drei"
import { CuboidCollider, RigidBody } from "@react-three/rapier"
import grass from "../assets/grass.jpg"

export function Ground(props) {
  const texture = useTexture(grass)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return (
    <RigidBody {...props} type="fixed" colliders={false}>
      <mesh receiveShadow position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={texture} map-repeat={[240, 240]} color="green" />
      </mesh>
      <CuboidCollider args={[100, 2, 100]} position={[0, -2, 0]} />
    </RigidBody>
  )
}
