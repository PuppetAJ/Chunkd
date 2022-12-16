import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
	Stats,
	Sky,
	Stars,
	softShadows,
	PointerLockControls,
	KeyboardControls,
	Loader,
	Preload,
	BakeShadows,
	PerformanceMonitor,
} from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Cube, Cubes } from "../Components/Cube";
import { Ground } from "../Components/Ground";
import { Player } from "../Components/Player";
import { Ground2 } from "../Components/Ground2";

export default function Editor() {
	softShadows();

	const [dpr, setDpr] = useState(1.5);
	return (
		<KeyboardControls
			map={[
				{ name: "forward", keys: ["ArrowUp", "w", "W"] },
				{ name: "backward", keys: ["ArrowDown", "s", "S"] },
				{ name: "left", keys: ["ArrowLeft", "a", "A"] },
				{ name: "right", keys: ["ArrowRight", "d", "D"] },
				{ name: "jump", keys: ["Space"] },
			]}
		>
			{/* <Suspense> */}
			<Canvas shadows camera={{ fov: 45 }}>
				{/* <PerformanceMonitor
					onIncline={() => setDpr(2)}
					onDecline={() => setDpr(1)}
				> */}
				<Preload all />
				<BakeShadows />
				<Sky
					elevation={0.6}
					rayleigh={1.558}
					azimuth={14.7}
					exposure={0.4349}
					sunPosition={[100, 10, 100]}
					turbidity={3.1}
				/>
				{/* <Stars
						radius={100}
						depth={50}
						count={5000}
						factor={4}
						saturation={0}
						fade
						speed={1}
					/> */}

				<ambientLight intensity={0.3} />
				<pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
				<Physics gravity={[0, -30, 0]}>
					<Ground />
					<Ground2 />
					<Player />
					<Cube position={[0, 0.5, -10]} />
					<Cubes />
				</Physics>
				<PointerLockControls />
				{/* </PerformanceMonitor> */}
				<Stats />
			</Canvas>
			{/* </Suspense> */}
			<Loader initialState={(active) => active} />
		</KeyboardControls>
	);
}
