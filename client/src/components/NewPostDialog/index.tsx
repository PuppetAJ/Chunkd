import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import type { Reference } from "@apollo/client";

import { ADD_THOUGHT } from "../../utils/mutations.ts";
import { QUERY_ME } from "../../utils/queries.ts";
import { requestErrorMessage } from "../../lib/credentials.ts";
import { useAuthStore } from "../../lib/auth.ts";
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

/** The part of cache.modify's toolkit that turns a cache id back into a link. */
interface Helpers {
  toReference: (id: string) => Reference | undefined;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The build picker is a plain <select> on purpose: a short list, correct on
 * every platform, and it opens the system picker on a phone.
 */
export default function NewPostDialog({ open, onOpenChange }: Props) {
  const me = useAuthStore((state) => state.user);
  const [thoughtText, setThoughtText] = useState("");
  const [selectedBuildId, setSelectedBuildId] = useState(NO_BUILD);
  const [submitError, setSubmitError] = useState("");

  const { loading, data } = useQuery(QUERY_ME);
  const builds: BuildSummary[] = (data as { me?: { builds?: BuildSummary[] } })?.me?.builds ?? [];

  // The mutation returns every field the feed asks for, so the post can go
  // straight into the lists that should hold it. Home pages by cache length,
  // which counts this one, so the next page still starts in the right place.
  const [addThought, { loading: submitting }] = useMutation(ADD_THOUGHT, {
    update(cache, { data }) {
      const created = (data as { addThought?: { _id: string } } | undefined)?.addThought;
      const posted = created && cache.identify({ __typename: "Thought", _id: created._id });
      if (!posted) return;

      const prepend = (existing: readonly Reference[] = [], { toReference }: Helpers) => {
        const ref = toReference(posted);
        return ref ? [ref, ...existing] : existing;
      };

      // Nothing asks Query.thoughts for one author, so the feed is stored once.
      cache.modify({ fields: { thoughts: prepend } });
      if (me) {
        cache.modify({
          id: cache.identify({ __typename: "User", _id: me._id }),
          fields: { thoughts: prepend },
        });
      }
    },
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
