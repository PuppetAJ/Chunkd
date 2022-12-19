import React from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
	AdaptiveDpr,
	Stats,
	Sky,
	softShadows,
	PointerLockControls,
	KeyboardControls,
	Loader,
	Preload,
	BakeShadows,
} from "@react-three/drei";
import { useControls, button, Leva } from "leva";
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
			<div
				style={{
					top: 16,
					right: 130,
					position: "absolute",
					width: "auto",
				}}
				className=".btn-minecraft"
			>
				<Leva
					flat={{
						flat: "true",
					}}
					titleBar={false}
					fill={true}
				/>
			</div>
			<Canvas gl={{ preserveDrawingBuffer: true }} shadows camera={{ fov: 45 }}>
				<Preload all />
				<Scene />
				<AdaptiveDpr pixelated />
				<BakeShadows />
				<Sky
					elevation={0.6}
					rayleigh={1.558}
					azimuth={14.7}
					exposure={0.4349}
					sunPosition={[100, 10, 100]}
					turbidity={3.1}
				/>

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
				<Stats />
			</Canvas>
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
	return <>{/* We are using this space to fill the return statement. */}</>;
}
