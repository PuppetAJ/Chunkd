import React, { Suspense, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
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
import { useControls, button, folder } from "leva";
import { Physics } from "@react-three/rapier";
import { Cube, Cubes } from "../Components/Cube";
import { Ground } from "../Components/Ground";
import { Player } from "../Components/Player";
import { Ground2 } from "../Components/Ground2";

import { useQuery, useMutation } from "@apollo/client";
import { QUERY_USER, QUERY_ME } from "../utils/queries";
import { Navigate, useParams } from "react-router-dom";
import Auth from "../utils/auth";

export default function Editor() {
	// const gl = useThree((state) => state.gl);
	// useControls({
	// 	screenshot: button(() => {
	// 		const link = document.createElement("a");
	// 		link.setAttribute("download", "canvas.png");
	// 		link.setAttribute(
	// 			"href",
	// 			gl.domElement
	// 				.toDataURL("image/png")
	// 				.replace("image/png", "image/octet-stream"),
	// 		);
	// 		link.click();
	// 	}),
	// });

	const [dpr, setDpr] = useState(1.5);

	const { username: userParam } = useParams();

	const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
		variables: { username: userParam },
	});

	const user = data?.me || data?.user || {};

	if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
		return <Navigate to='/Editor' />;
	}

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!user?.username) {
		return (
			<h4>
				You need to be logged in to see this page. Please log in or sign up!
			</h4>
		);
	}

	softShadows();

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
			<Canvas gl={{ preserveDrawingBuffer: true }} shadows camera={{ fov: 45 }}>
				{/* <PerformanceMonitor
					onIncline={() => setDpr(2)}
					onDecline={() => setDpr(1)}
				> */}
				<Preload all />
				<Scene />
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
				{/* </Scene> */}
				<Stats />
			</Canvas>
			{/* </Suspense> */}
			<Loader initialState={(active) => active} />
		</KeyboardControls>
	);
}

function Scene() {
	const gl = useThree((state) => state.gl);
	useControls({
		screenshot: button(() => {
			const link = document.createElement("a");
			link.setAttribute("download", "Saved.png");
			link.setAttribute(
				"href",
				gl.domElement
					.toDataURL("image/png")
					.replace("image/png", "image/octet-stream"),
			);
			link.click();
		}),
	});
	return (
		<>
			{/* <Dragon position={[0, -0.5, -0.5]} rotation={[0, 0.5, 0]} /> */}
			{/* <Duck rotation={[0, 0.5, 0]} scale={0.8} position={[-1.6, -0.5, 1]} /> */}
			{/* <Ruby scale={0.8} rotation={[-0.2, -0.1, -0.55]} position={[1, -0.05, 1]} /> */}
			{/* <Backdrop
				receiveShadow
				scale={[15, 8, 5]}
				floor={1.5}
				position={[0, -0.5, -4]}
			> */}
			{/* <meshPhysicalMaterial metalness={0} roughness={0.15} color="#101020" /> */}
			{/* </Backdrop> */}
			{/* <rectAreaLight
				args={["white", 20]}
				width={2}
				height={2}
				position={[3, 3, -2]}
				target={[0, 0, 0]}
				visible={false}
			/> */}
		</>
	);
}
