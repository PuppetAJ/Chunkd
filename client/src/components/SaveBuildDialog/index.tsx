import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";

import { SAVE_BUILD } from "../../utils/mutations.ts";
import { QUERY_ME } from "../../utils/queries.ts";
import { BUILD_FORMAT_VERSION } from "../../lib/voxel/format.ts";
import { useEditorUiStore } from "../../lib/editorUiStore.ts";
import { requestErrorMessage } from "../../lib/credentials.ts";
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

const MAX_NAME_LENGTH = 60;

/**
 * Names a world before it is saved.
 *
 * Every build used to be saved as "Untitled build", because the save was a
 * single keypress with nowhere to type. The world and its picture are captured
 * the instant P is pressed, so the thumbnail shows the view the player chose
 * rather than whatever the camera drifted to while they were typing.
 */
export default function SaveBuildDialog() {
  const pending = useEditorUiStore((state) => state.pendingSave);
  const setPendingSave = useEditorUiStore((state) => state.setPendingSave);
  const setSaveStatus = useEditorUiStore((state) => state.setSaveStatus);

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const [saveBuild, { loading }] = useMutation(SAVE_BUILD, { refetchQueries: [QUERY_ME] });

  // Each capture starts a fresh naming, so clear whatever was typed last time.
  useEffect(() => {
    if (pending) {
      setName("");
      setError("");
    }
  }, [pending]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;

    setError("");
    setSaveStatus("saving", "Saving...");
    try {
      await saveBuild({
        variables: {
          name: name.trim() || "Untitled build",
          data: pending.data,
          thumbnail: pending.thumbnail,
          format: BUILD_FORMAT_VERSION,
        },
      });
      setPendingSave(null);
      setSaveStatus("saved", "Build saved");
      window.setTimeout(() => useEditorUiStore.getState().setSaveStatus("idle"), 2500);
    } catch (requestError) {
      setSaveStatus("idle");
      setError(requestErrorMessage(requestError));
    }
  };

  return (
    <Dialog open={pending !== null} onOpenChange={(next) => !next && setPendingSave(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this build</DialogTitle>
          <DialogDescription>
            It will appear on your profile, and you can attach it to a post.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {pending?.thumbnail && (
            <img
              src={pending.thumbnail}
              alt="The view at the moment you pressed save"
              className="w-full rounded-lg border border-border"
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="buildName">Name</Label>
            <Input
              id="buildName"
              name="buildName"
              autoFocus
              placeholder="Untitled build"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPendingSave(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save build"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
