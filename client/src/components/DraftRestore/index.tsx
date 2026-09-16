import { formatTimestamp } from "../../lib/formatTimestamp.ts";
import type { Draft } from "../../lib/voxel/draft.ts";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";

interface Props {
  draft: Draft;
  onRestore: () => void;
  onDiscard: () => void;
}

/** Offer back a world the editor kept in this browser but never saved. */
export default function DraftRestore({ draft, onRestore, onDiscard }: Props) {
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Pick up where you left off?</DialogTitle>
          <DialogDescription>
            {draft.source
              ? `There is unsaved work on “${draft.source.name}” from ${formatTimestamp(new Date(draft.savedAt).toISOString())}.`
              : `There is an unsaved world from ${formatTimestamp(new Date(draft.savedAt).toISOString())}.`}{" "}
            It was kept in this browser rather than saved to your account.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDiscard}>
            Start fresh
          </Button>
          <Button type="button" onClick={onRestore}>
            Restore it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
