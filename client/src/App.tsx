import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import SiteLayout from "./components/SiteLayout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import NoMatch from "./pages/NoMatch.tsx";
import EditorUnavailable from "./components/EditorUnavailable/index.tsx";
import { useHasFinePointer } from "./lib/useHasFinePointer.ts";

// Three.js, the physics engine and its WebAssembly module together are larger
// than everything else in the app combined. Loading these routes on demand keeps
// them out of the bundle that the login and feed pages have to download.
const Editor = lazy(() => import("./pages/Editor.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const SingleThought = lazy(() => import("./pages/SingleThought.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));

export default function App() {
  return (
    <Routes>
      {/* Everything except the editor is a page inside the site shell. */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
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

      {/* The editor owns the whole window: it is pointer-locked, full-bleed and
          draws its own overlay, so it sits outside the shell rather than
          fighting a sticky header and a footer for the same pixels. */}
      <Route path="/editor" element={<EditorRoute />} />
    </Routes>
  );
}

/**
 * The editor route, with the devices that cannot run it turned away first.
 *
 * The check sits outside RequireAuth on purpose. Someone on a phone should be
 * told the editor will not work here, not made to log in and then told.
 * Checking first also means the three.js chunk is never downloaded on a device
 * that has no use for it.
 */
function EditorRoute() {
  const hasFinePointer = useHasFinePointer();
  if (!hasFinePointer) return <EditorUnavailable />;

  return (
    <RequireAuth>
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
