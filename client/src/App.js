// import React from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
// import logo from './logo.svg';
import "./App.css";

function App(props) {
	return (
		<>
			{/* <div>Outside Canvas</div> */}
			<Canvas>
				<Sky
					distance={450000}
					sunPosition={[5, 1, 8]}
					inclination={0}
					azimuth={0.25}
					{...props}
				/>
			</Canvas>
		</>
	);
}

export default App;
