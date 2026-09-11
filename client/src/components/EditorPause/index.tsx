import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Globe2, MousePointerClick } from "lucide-react";
import { Button } from "../ui/button.tsx";
import SceneSettingsMenu from "../SceneSettingsMenu.tsx";
import NewWorldDialog from "../NewWorldDialog/index.tsx";
import { useEditorSettings } from "../../lib/sceneSettings.ts";

/**
 * The screen shown whenever the player is not in the world.
 *
 * It is the editor's front door on arrival and its pause screen afterwards,
 * because both want exactly the same thing on screen: what the controls are and
 * a way back in. It replaces a "Controls" button that used to live in the site
 * header, which the editor no longer renders.
 */

const CONTROLS: [string, string][] = [
  ["Left click / C", "Break a block (hold to keep going)"],
  ["Right click / F", "Place a block (hold to keep going)"],
  ["WASD / arrows", "Move"],
  ["Space", "Jump"],
  ["Space, twice", "Toggle flight"],
  ["While flying", "Space up, Shift down"],
  ["Shift", "Move slowly"],
  ["1 - 9", "Choose a hotbar slot"],
  ["Scroll wheel", "Move along the hotbar"],
  ["R", "Whole block, slab or stairs"],
  ["E", "Open the block inventory"],
  ["P", "Save the build"],
  ["Esc", "Release the mouse"],
];

interface Props {
  /** True the first time, so the copy can welcome rather than say "paused". */
  firstVisit: boolean;
  onPlay: () => void;
}

export default function EditorPause({ firstVisit, onPlay }: Props) {
  const settings = useEditorSettings((state) => state.settings);
  const setSettings = useEditorSettings((state) => state.setSettings);
  const [newWorldOpen, setNewWorldOpen] = useState(false);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onPlay}
    >
      <div
        // Named so a test can find the pause screen without matching on
        // class names, and without going through the accessibility tree, which
        // hides everything behind an open menu.
        data-pause-card
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
        // The card is part of the click target for playing, but the two links
        // inside it are not, so stop those clicks from also locking the mouse.
        onClick={(event) => event.stopPropagation()}
      >
        {/* Changing how the world is lit needs a cursor, and the only time
            there is one is while paused. It belongs here rather than as another
            thing floating over the crosshair. */}
        <div className="absolute top-4 right-4">
          <SceneSettingsMenu settings={settings} onChange={setSettings} />
        </div>

        <h1 className="font-display text-2xl">{firstVisit ? "Build something" : "Paused"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {firstVisit
            ? "A fresh world, generated just for you."
            : "Your world is exactly where you left it."}
        </p>

        <Button className="mt-5 w-full" size="lg" onClick={onPlay}>
          <MousePointerClick />
          Click to play
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="mt-2 w-full"
          onClick={() => setNewWorldOpen(true)}
        >
          <Globe2 />
          New world
        </Button>

        {/* The way out is a button of its own rather than a footnote. Getting
            stuck in a pointer-locked full-screen view with no visible exit is
            the easiest way to lose someone. */}
        <Button asChild variant="outline" size="lg" className="mt-2 w-full">
          <Link to="/">
            <ChevronLeft />
            Leave the editor
          </Link>
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Press Esc at any time to pause and come back to this screen. The
          settings button changes how the world is lit, and a build&apos;s picture
          is taken from exactly what you see when you press P.
        </p>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {CONTROLS.map(([key, description]) => (
            <div key={key} className="contents">
              <dt className="text-right font-medium whitespace-nowrap">{key}</dt>
              <dd className="text-muted-foreground">{description}</dd>
            </div>
          ))}
        </dl>

        {/* The site footer carries this too, but the editor covers the footer,
            and Faithful's licence asks for the credit to be somewhere obvious
            wherever their work is used. */}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Block textures from{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://faithfulpack.net/faithful32x"
            target="_blank"
            rel="noreferrer"
          >
            Faithful 32x
          </a>
          , used under the{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://faithfulpack.net/license"
            target="_blank"
            rel="noreferrer"
          >
            Faithful licence
          </a>
          . Not an official Minecraft product.
        </p>

        {/* Inside the card, not beside it. The dialog renders through a portal,
            so its markup leaves this subtree, but React sends events up the
            component tree rather than the DOM tree. Outside the card, every
            click in the dialog would reach the backdrop's onClick, start play,
            unmount this screen and take the dialog with it. */}
        <NewWorldDialog open={newWorldOpen} onOpenChange={setNewWorldOpen} />
      </div>
    </div>
  );
}
