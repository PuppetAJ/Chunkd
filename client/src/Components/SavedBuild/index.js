import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Stats,
  Sky,
  softShadows,
  Preload,
  BakeShadows,
  OrbitControls,
} from "@react-three/drei";
import { Save } from "../Save";
import { useQuery } from "@apollo/client";
import { QUERY_USER, QUERY_ME } from "../../utils/queries";
import { Navigate, useParams } from "react-router-dom";
import Auth from "../../utils/auth";

export default function SavedBuild(props) {
  const { username: userParam } = useParams();

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam },
  });

  const user = data?.me || data?.user || {};

  if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
    return <Navigate to="/test" />;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user?.username) {
    return (
      <h3 className="btn-minecraft flex flex-col items-center m-auto animate-pulse">
        You need to be logged in to see this page. Please log in or sign up!
      </h3>
    );
  }

  softShadows();

  return (
    <>
      <div id="save-container" className="mt-8">
        <div id="save-wrapper">
          <Canvas
            gl={{ preserveDrawingBuffer: true }}
            shadows
            camera={{ fov: 45, position: [-40, 20, -40] }}
          >
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
            <OrbitControls />
            <Save build={props.data} />
            <ambientLight intensity={0.3} />
            <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
            {/* FPS counter used for performance */}
            {/* <Stats /> */}
          </Canvas>
        </div>
      </div>
    </>
  );
}
