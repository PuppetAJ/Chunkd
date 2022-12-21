import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Stats,
  Sky,
  softShadows,
  Loader,
  Preload,
  BakeShadows,
  OrbitControls,
} from "@react-three/drei";
import { Save } from "../Components/Save";
import { useQuery } from "@apollo/client";
import { QUERY_USER, QUERY_ME } from "../utils/queries";
import { Navigate, useParams } from "react-router-dom";
import Auth from "../utils/auth";

export default function LoadTest() {
  const { username: userParam } = useParams();

  const [selected, setSelected] = useState(0);

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
      <h4>
        You need to be logged in to see this page. Please log in or sign up!
      </h4>
    );
  }

  softShadows();

  function handleChange(e) {
    setSelected(+e.target.value);
    console.log(typeof selected);
    // console.log(selected);
    //console.log(e.target.value);
  }

  return (
    <>
      <div id="test-select">
        <select onChange={handleChange} id="dropdown">
          {user.savedBuilds.map((el, i) => (
            <option key={i} value={i}>{`Build ${i + 1}`}</option>
          ))}
        </select>
      </div>
      <div id="save-container">
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
            <Save build={user.savedBuilds[selected]} />
            <ambientLight intensity={0.3} />
            <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
            <Stats />
          </Canvas>
          <Loader />
        </div>
      </div>
    </>
  );
}
