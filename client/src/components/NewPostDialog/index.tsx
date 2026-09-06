import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";

import { ADD_THOUGHT } from "../../utils/mutations.ts";
import { QUERY_THOUGHTS, QUERY_ME } from "../../utils/queries.ts";
import { FEED_PAGE_SIZE } from "../../lib/feedTypes.ts";
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
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";

const MAX_LENGTH = 280;
const NO_BUILD = "";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The "share a build" dialog.
 *
 * The build picker stays a plain <select>. It is a short list of the user's own
 * builds, the native control is already keyboard and screen-reader correct on
 * every platform, and on a phone it opens the system picker.
 */
export default function NewPostDialog({ open, onOpenChange }: Props) {
  const [thoughtText, setThoughtText] = useState("");
  const [selectedBuildId, setSelectedBuildId] = useState(NO_BUILD);
  const [submitError, setSubmitError] = useState("");

  // Only the poster's own builds can be attached, so this always asks about the
  // signed-in user rather than whichever profile is being viewed.
  const { loading, data } = useQuery(QUERY_ME);
  const builds: BuildSummary[] = (data as { me?: { builds?: BuildSummary[] } })?.me?.builds ?? [];

  // The feed is paged and the profile's list is nested inside another query,
  // so a new post is easier to get right by asking for both again than by
  // splicing it into two different cache shapes by hand.
  const [addThought, { loading: submitting }] = useMutation(ADD_THOUGHT, {
    refetchQueries: [
      { query: QUERY_THOUGHTS, variables: { limit: FEED_PAGE_SIZE, offset: 0 } },
      { query: QUERY_ME },
    ],
  });

  const close = () => {
    setThoughtText("");
    setSelectedBuildId(NO_BUILD);
    setSubmitError("");
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");

    if (!thoughtText.trim()) {
      setSubmitError("Write something before posting.");
      return;
    }

    try {
      await addThought({
        variables: {
          thoughtText: thoughtText.trim(),
          // The old code sent the whole world as a JSON string on every post.
          // It now sends the id of a saved build, or nothing at all.
          buildId: selectedBuildId || null,
        },
      });
      close();
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
    }
  };

  const atLimit = thoughtText.length === MAX_LENGTH;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share a build</DialogTitle>
          <DialogDescription>
            Say something about it, and optionally attach one of your saved worlds.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="thoughtText">Post</Label>
            <Textarea
              id="thoughtText"
              name="thoughtText"
              placeholder="Share something new!"
              value={thoughtText}
              rows={4}
              aria-describedby="thoughtCount"
              onChange={(event) => setThoughtText(event.target.value.slice(0, MAX_LENGTH))}
            />
            <p
              id="thoughtCount"
              className={atLimit ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
            >
              {thoughtText.length}/{MAX_LENGTH} characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropdown">Attach a build</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading your builds...</p>
            ) : builds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no saved builds yet. Anything you save in the editor shows up here.
              </p>
            ) : (
              <select
                id="dropdown"
                value={selectedBuildId}
                onChange={(event) => setSelectedBuildId(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value={NO_BUILD}>No build attached</option>
                {builds.map((build) => (
                  <option key={build._id} value={build._id}>
                    {build.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
