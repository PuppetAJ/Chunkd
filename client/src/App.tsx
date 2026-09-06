import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import SiteLayout from "./components/SiteLayout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import NoMatch from "./pages/NoMatch.jsx";

// Three.js, the physics engine and its WebAssembly module together are larger
// than everything else in the app combined. Loading these routes on demand keeps
// them out of the bundle that the login and feed pages have to download.
const Editor = lazy(() => import("./pages/Editor.tsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const SingleThought = lazy(() => import("./pages/SingleThought.jsx"));

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
        <Route path="*" element={<NoMatch />} />
      </Route>

      {/* The editor owns the whole window: it is pointer-locked, full-bleed and
          draws its own overlay, so it sits outside the shell rather than
          fighting a sticky header and a footer for the same pixels. */}
      <Route
        path="/editor"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <Suspense fallback={<EditorLoading />}>
                <Editor />
              </Suspense>
            </ErrorBoundary>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function EditorLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <p className="font-display text-lg text-muted-foreground">Generating world...</p>
    </div>
  );
}
