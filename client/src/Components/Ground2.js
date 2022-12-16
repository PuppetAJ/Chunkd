import React from "react";
import { useState, useEffect, useRef, useCallbac, Fragment } from "react";
import * as THREE from "three";
import { Noise } from "noisejs";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import {
	useTexture,
	Edges,
	Instances,
	Instance,
	Merged,
	Box,
	Sphere,
} from "@react-three/drei";
import create from "zustand";
import grass from "../assets/grass.png";

export function Ground2(props) {
	// Notes: Instanced mesh seems like the best approach for now
	// - I'm sure there's a way to cull unseen faces in between blocks but at the moment there isn't enough time to research that solution with instances
	// - Even rendering one face per block as separate instances, instancing outpreforms by miles with full blocks
	// - Perhaps merging the geometry would be a solution(?)
	// - Mentions of using a texture atlas to improve preformance

	const [blocks, setBlocks] = useState([]);
	// https://discourse.threejs.org/t/directly-remove-instancedmesh-instance/25504/2
	// oh boy..

	const texture = useTexture(grass);

	useEffect(() => {
		const noise = new Noise(Math.random());
		let blockStore = [];
		let xOff = 0;
		let zOff = 0;
		let inc = 0.05;
		let amplitude = 35;
		for (let x = 0; x < 32; x++) {
			xOff = 0;
			for (let z = 0; z < 32; z++) {
				let y = Math.round((noise.perlin2(xOff, zOff) * amplitude) / 5) + 2;
				blockStore.push([x, y, z]);
				// Only create hollow shell to improve preformance, calc perimeter
				if (x === 0 || x === 15) {
					for (let j = y; j > 0; j--) {
						blockStore.push([x, y - j, z]);
					}
				}

				if (z === 0 || z === 15) {
					for (let j = y; j > 0; j--) {
						blockStore.push([x, y - j, z]);
					}
				}

				blockStore.push([x, -1, z]);
				xOff = xOff + inc;
			}
			zOff = zOff + inc;
		}

		setBlocks(blockStore);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	console.log(blocks.length);
	return (
		<Instances limit={1000000}>
			<boxGeometry />
			{/* <meshStandardMaterial/> */}
			{[...Array(6)].map((_, index) => (
				<meshStandardMaterial
					attach={`material-${index}`}
					key={index}
					map={texture}
				/>
			))}
			{blocks.map(([x, y, z], i) => (
				<Fragment key={i}>
					<Instance
						color="red"
						castShadow
						receiveShadow
						key={i}
						position={[x, y, z]}
					>
						<CuboidCollider args={[0.4, 0.4, 0.4]} />
					</Instance>
				</Fragment>
			))}
		</Instances>
	);
}
