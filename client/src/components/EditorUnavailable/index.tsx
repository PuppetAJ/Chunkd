import { Link } from "react-router";
import { ChevronLeft, Keyboard } from "lucide-react";
import { Button } from "../ui/button.tsx";

/**
 * Shown instead of the editor on a device with no mouse or trackpad.
 *
 * Without this the editor loaded on a phone and then trapped whoever opened it.
 * Play started, the pointer lock was refused, and nothing on screen responded
 * to touch. There was no way back either, because the pause screen only appears
 * when play stops and the only thing that stops play is the Escape key.
 *
 * The route deliberately sits outside the site shell, like the editor itself,
 * so this carries its own way out rather than relying on a header.
 */
export default function EditorUnavailable() {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <Keyboard className="size-6 text-muted-foreground" />
        </div>

        <h1 className="mt-4 font-display text-2xl">The editor needs a keyboard</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Building uses WASD to move, the mouse to look and aim, and the number keys to pick
          blocks. There is no touch version yet, so the editor only opens on a laptop or a
          desktop.
        </p>

        <p className="mt-3 text-sm text-muted-foreground">
          Everything else works here. You can read the feed, open any build in 3D and turn it
          around with a finger, and comment on posts.
        </p>

        <Button asChild size="lg" className="mt-6 w-full">
          <Link to="/">
            <ChevronLeft />
            Back to the feed
          </Link>
        </Button>
      </div>
    </div>
  );
}
