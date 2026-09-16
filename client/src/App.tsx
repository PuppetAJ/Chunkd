import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import SiteLayout from "./components/SiteLayout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import Home from "./pages/Home.tsx";
import Landing from "./pages/Landing.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import NoMatch from "./pages/NoMatch.tsx";
import EditorUnavailable from "./components/EditorUnavailable/index.tsx";
import { useHasFinePointer } from "./lib/useHasFinePointer.ts";
import { useAuthStore } from "./lib/auth.ts";
import { useSessionRenewal } from "./lib/useSessionRenewal.ts";

// Keeps three.js and the physics engine out of the login and feed bundle.
const Editor = lazy(() => import("./pages/Editor.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const SingleThought = lazy(() => import("./pages/SingleThought.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));

export default function App() {
  useSessionRenewal();

  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/thought/:id" element={<SingleThought />} />
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
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NoMatch />} />
      </Route>

      {/* The editor is pointer-locked and full-bleed, so it sits outside the shell. */}
      <Route path="/editor" element={<EditorRoute />} />
    </Routes>
  );
}

function Root() {
  const loggedIn = useAuthStore((state) => state.isLoggedIn);
  return loggedIn ? <Home /> : <Landing />;
}

// The pointer check sits outside RequireAuth on purpose: a phone should be
// turned away before being asked to log in, and before the three.js chunk loads.
function EditorRoute() {
  const hasFinePointer = useHasFinePointer();
  if (!hasFinePointer) return <EditorUnavailable />;

  return (
    <RequireAuth keepMounted>
      <ErrorBoundary>
        <Suspense fallback={<EditorLoading />}>
          <Editor />
        </Suspense>
      </ErrorBoundary>
    </RequireAuth>
  );
}

function EditorLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <p className="font-display text-lg text-muted-foreground">Generating world...</p>
    </div>
  );
}
