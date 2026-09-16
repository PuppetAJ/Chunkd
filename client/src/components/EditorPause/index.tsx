import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Globe2, MousePointerClick } from "lucide-react";
import { Button } from "../ui/button.tsx";
import SceneSettingsMenu from "../SceneSettingsMenu.tsx";
import NewWorldDialog from "../NewWorldDialog/index.tsx";
import { useEditorSettings } from "../../lib/sceneSettings.ts";

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
  ["`", "Break and place a bigger square, Shift+` smaller"],
  ["Q / middle click", "Pick up the block you are looking at"],
  ["E", "Open the block inventory"],
  ["P", "Save the build"],
  ["Esc", "Release the mouse"],
];

interface Props {
  /** True the first time, so the copy can welcome rather than say "paused". */
  firstVisit: boolean;
  /** The name of a saved build still being fetched, which holds play back. */
  loading?: string | null;
  onPlay: () => void;
}

export default function EditorPause({ firstVisit, loading = null, onPlay }: Props) {
  const settings = useEditorSettings((state) => state.settings);
  const setSettings = useEditorSettings((state) => state.setSettings);
  const [newWorldOpen, setNewWorldOpen] = useState(false);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={loading ? undefined : onPlay}
    >
      <div
        // A test finds the pause screen by this.
        data-pause-card
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute top-4 right-4">
          <SceneSettingsMenu settings={settings} onChange={setSettings} />
        </div>

        <h1 className="font-display text-2xl">{firstVisit ? "Build something" : "Paused"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? `Loading "${loading}"...`
            : firstVisit
              ? "A fresh world, generated just for you."
              : "Your world is exactly where you left it."}
        </p>

        <Button className="mt-5 w-full" size="lg" onClick={onPlay} disabled={loading !== null}>
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

        {/* The editor covers the footer, and the licence wants the credit visible. */}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Block textures from{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://github.com/Athemis/PixelPerfectionCE"
            target="_blank"
            rel="noreferrer"
          >
            Pixel Perfection
          </a>{" "}
          by XSSheep and its community maintainers, used under{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>
          . Not an official Minecraft product.
        </p>

        {/* Inside the card, not beside it. The dialog portals out of the DOM subtree
            but React still bubbles its clicks up the component tree, and the
            backdrop's onClick would start play and unmount the dialog. */}
        <NewWorldDialog open={newWorldOpen} onOpenChange={setNewWorldOpen} />
      </div>
    </div>
  );
}
