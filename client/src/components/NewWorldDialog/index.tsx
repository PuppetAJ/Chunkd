import { useState } from "react";
import { Loader2, Sprout, Trees } from "lucide-react";

import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { randomSeed, WORLD_SIZES } from "../../lib/voxel/terrain.ts";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Slider } from "../ui/slider.tsx";
import { Switch } from "../ui/switch.tsx";

/**
 * Generate a fresh world, with a say in what comes out.
 *
 * The editor used to seed itself at random on arrival with no way to ask for
 * anything else, so the only route to a world you wanted was reloading until
 * you got one.
 */

/** How each size is described. The index is the slider's value. */
const SIZE_LABELS = ["1 x 1", "2 x 2", "3 x 3"];

/** Blocks across, for the line under the slider. */
const SIZE_NOTES = [
  "The original size. Generates instantly.",
  "Four times the ground. A moment to generate.",
  "Nine times the ground. Takes a second or so, and asks more of your machine.",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewWorldDialog({ open, onOpenChange }: Props) {
  const newWorld = useWorldStore((state) => state.newWorld);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [trees, setTrees] = useState(true);
  const [seedText, setSeedText] = useState("");
  const [working, setWorking] = useState(false);

  const size = WORLD_SIZES[sizeIndex] ?? WORLD_SIZES[0];

  const generate = () => {
    const typed = Number.parseInt(seedText.trim(), 10);
    const seed = Number.isFinite(typed) && typed >= 0 ? typed : randomSeed();

    setWorking(true);
    // A 3x3 world is around half a million blocks and blocks the main thread
    // for about a second while it is built. Yielding first lets the button
    // reach its loading state, so the freeze reads as work rather than a
    // click that did nothing.
    window.setTimeout(() => {
      newWorld(seed, { size, trees });
      setWorking(false);
      onOpenChange(false);
    }, 30);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New world</DialogTitle>
          <DialogDescription>
            This replaces the world you are in. Anything unsaved in it is lost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="world-size">Size</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {SIZE_LABELS[sizeIndex]} &middot; {size} blocks across
              </span>
            </div>
            <Slider
              id="world-size"
              min={0}
              max={WORLD_SIZES.length - 1}
              step={1}
              value={[sizeIndex]}
              onValueChange={([next]) => setSizeIndex(next ?? 0)}
            />
            <p className="text-xs text-muted-foreground">{SIZE_NOTES[sizeIndex]}</p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="world-trees" className="flex items-center gap-2">
                {trees ? <Trees className="size-4" /> : <Sprout className="size-4" />}
                Trees
              </Label>
              <p className="text-xs text-muted-foreground">
                Off gives bare ground, with nothing to clear before you start.
              </p>
            </div>
            <Switch
              id="world-trees"
              checked={trees}
              onCheckedChange={setTrees}
              aria-label="Plant trees"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="world-seed">Seed</Label>
            <Input
              id="world-seed"
              inputMode="numeric"
              placeholder="Leave blank for a random one"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The same seed and size always give the same landscape.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={working}>
            {working && <Loader2 className="animate-spin" />}
            {working ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
