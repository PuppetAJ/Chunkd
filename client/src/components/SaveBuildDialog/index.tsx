import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";

import { SAVE_BUILD, UPDATE_BUILD } from "../../utils/mutations.ts";
import { QUERY_ME } from "../../utils/queries.ts";
import { BUILD_FORMAT_VERSION } from "../../lib/voxel/format.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { useEditorUiStore } from "../../lib/editorUiStore.ts";
import { requestErrorMessage } from "../../lib/credentials.ts";
import type { BuildSummary } from "../../lib/feedTypes.ts";
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
 * Names a world before it is saved, and asks before a name is reused.
 *
 * The world and its picture are captured the instant P is pressed, so the
 * thumbnail shows the view the player chose rather than wherever the camera
 * drifted while they were typing. A name that matches a build they already
 * have is offered as an overwrite: saving a work in progress every few minutes
 * would otherwise leave a trail of copies, and the cap is fifty.
 */
export default function SaveBuildDialog() {
  const pending = useEditorUiStore((state) => state.pendingSave);
  const setPendingSave = useEditorUiStore((state) => state.setPendingSave);
  const setSaveStatus = useEditorUiStore((state) => state.setSaveStatus);
  const source = useWorldStore((state) => state.source);
  const setSource = useWorldStore((state) => state.setSource);

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  // The existing build a typed name collides with, while the player decides.
  const [conflict, setConflict] = useState<BuildSummary | null>(null);

  const { data: me } = useQuery(QUERY_ME);
  const builds: BuildSummary[] = (me as { me?: { builds?: BuildSummary[] } })?.me?.builds ?? [];

  const [saveBuild, { loading: saving }] = useMutation(SAVE_BUILD, { refetchQueries: [QUERY_ME] });
  const [updateBuild, { loading: updating }] = useMutation(UPDATE_BUILD, {
    refetchQueries: [QUERY_ME],
  });
  const loading = saving || updating;

  // Each capture starts a fresh naming. A world opened from a saved build
  // starts from that build's name, since overwriting it is the likely intent.
  useEffect(() => {
    if (pending) {
      setName(source?.name ?? "");
      setError("");
      setConflict(null);
    }
  }, [pending, source]);

  const finish = (saved: BuildSummary) => {
    setSource({ id: saved._id, name: saved.name });
    setPendingSave(null);
    setSaveStatus("saved", "Build saved");
    window.setTimeout(() => useEditorUiStore.getState().setSaveStatus("idle"), 2500);
  };

  const fail = (requestError: unknown) => {
    setSaveStatus("idle");
    setError(requestErrorMessage(requestError));
  };

  const trimmedName = () => name.trim() || "Untitled build";

  const saveAsNew = async () => {
    if (!pending) return;
    setError("");
    setSaveStatus("saving", "Saving...");
    try {
      const result = await saveBuild({
        variables: {
          name: trimmedName(),
          data: pending.data,
          thumbnail: pending.thumbnail,
          format: BUILD_FORMAT_VERSION,
        },
      });
      finish((result.data as { saveBuild: BuildSummary }).saveBuild);
    } catch (requestError) {
      fail(requestError);
    }
  };

  const overwrite = async () => {
    if (!pending || !conflict) return;
    setError("");
    setSaveStatus("saving", "Saving...");
    try {
      const result = await updateBuild({
        variables: {
          buildId: conflict._id,
          name: trimmedName(),
          data: pending.data,
          thumbnail: pending.thumbnail,
          format: BUILD_FORMAT_VERSION,
        },
      });
      finish((result.data as { updateBuild: BuildSummary }).updateBuild);
    } catch (requestError) {
      fail(requestError);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const wanted = trimmedName().toLowerCase();
    const existing = builds.find((build) => build.name.toLowerCase() === wanted);
    if (existing) setConflict(existing);
    else void saveAsNew();
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

          {conflict ? (
            <div className="space-y-4">
              <p className="text-sm">
                You already have a build named &ldquo;{conflict.name}&rdquo;. Overwrite it with this
                one, or keep both?
              </p>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setConflict(null)}>
                  Back
                </Button>
                <Button type="button" variant="outline" disabled={loading} onClick={saveAsNew}>
                  Keep both
                </Button>
                <Button type="button" disabled={loading} onClick={overwrite}>
                  {loading ? "Saving..." : "Overwrite"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
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
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
