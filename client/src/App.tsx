import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import Header from "./components/Header/index.jsx";
import Footer from "./components/Footer/index.jsx";
import RequireAuth from "./components/RequireAuth.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import NoMatch from "./pages/NoMatch.jsx";

// Three.js, the physics engine and its WebAssembly module together are larger
// than everything else in the app combined. Loading these routes on demand keeps
// them out of the bundle that the login and feed pages have to download.
const Editor = lazy(() => import("./pages/Editor.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const SingleThought = lazy(() => import("./pages/SingleThought.jsx"));

function RouteFallback() {
  return <div className="minecraft m-auto p-8 text-center text-gray-300">Loading...</div>;
}

export default function App() {
  return (
    <>
      <Header />
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/thought/:id" element={<SingleThought />} />

          <Route
            path="/editor"
            element={
              <RequireAuth>
                <Editor />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NoMatch />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
      <Footer />
    </>
  );
}
