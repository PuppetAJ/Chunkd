import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "@apollo/client/react";
import { Blocks, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { UPDATE_THOUGHT, DELETE_THOUGHT } from "../../utils/mutations.ts";
import { QUERY_THOUGHTS, QUERY_ME } from "../../utils/queries.ts";
import { formatTimestamp } from "../../lib/formatTimestamp.ts";
import { useAuthStore } from "../../lib/auth.ts";
import type { BuildSummary, Thought } from "../../lib/feedTypes.ts";
import UserAvatar from "../UserAvatar.tsx";
import { Button } from "../ui/button.tsx";
import { Textarea } from "../ui/textarea.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";

const MAX_LENGTH = 280;
const NO_BUILD = "";

interface Props {
  thought: Thought;
  /** The profile page already says whose posts these are. */
  showAuthor?: boolean;
  /** The post's own page has the comments below it, so the link is pointless there. */
  showCommentsLink?: boolean;
  /** The post's own page shows the build in 3D above this, so the still is noise there. */
  showBuild?: boolean;
  /** Lets the post's own page navigate away once the post is gone. */
  onDeleted?: () => void;
}

export default function ThoughtCard({
  thought,
  showAuthor = true,
  showCommentsLink = true,
  showBuild = true,
  onDeleted,
}: Props) {
  const me = useAuthStore((state) => state.user?.username ?? "");
  const author = thought.username ?? me;
  const isMine = Boolean(me) && author === me;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thought.thoughtText);
  const [draftBuildId, setDraftBuildId] = useState(thought.build?._id ?? NO_BUILD);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Only while the editor is open: a feed of cards must not each fetch this.
  const { data: mine } = useQuery(QUERY_ME, { skip: !editing });
  const myBuilds: BuildSummary[] = (mine as { me?: { builds?: BuildSummary[] } })?.me?.builds ?? [];

  const [updateThought, { loading: saving }] = useMutation(UPDATE_THOUGHT);
  const [deleteThought, { loading: deleting }] = useMutation(DELETE_THOUGHT, {
    refetchQueries: [{ query: QUERY_THOUGHTS }, { query: QUERY_ME }],
  });

  const startEditing = () => {
    setDraft(thought.thoughtText);
    setDraftBuildId(thought.build?._id ?? NO_BUILD);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft(thought.thoughtText);
    setDraftBuildId(thought.build?._id ?? NO_BUILD);
  };

  const saveEdit = async () => {
    const text = draft.trim();
    const buildChanged = draftBuildId !== (thought.build?._id ?? NO_BUILD);
    if (!text || (text === thought.thoughtText && !buildChanged)) {
      cancelEditing();
      return;
    }
    await updateThought({
      variables: {
        thoughtId: thought._id,
        thoughtText: text,
        // Null detaches; the server leaves the build alone when this is absent.
        buildId: draftBuildId || null,
      },
    });
    setEditing(false);
  };

  return (
    <article className="relative rounded-xl border border-border bg-card transition-colors hover:border-border/80">
      {/* Stretched over the card rather than wrapping it, since links cannot nest.
          Interactive children get a position of their own so they sit above it. */}
      {showCommentsLink && !editing && (
        <Link
          to={`/thought/${thought._id}`}
          className="absolute inset-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="sr-only">Open this post</span>
        </Link>
      )}

      <header className="flex items-center gap-3 px-4 pt-4">
        {showAuthor ? (
          <Link to={`/profile/${author}`} className="group relative flex items-center gap-2.5">
            <UserAvatar username={author} size="sm" />
            <span className="text-sm font-medium group-hover:underline">{author}</span>
          </Link>
        ) : (
          <UserAvatar username={author} size="sm" />
        )}
        <time className="text-xs text-muted-foreground" dateTime={thought.createdAt}>
          {formatTimestamp(thought.createdAt)}
        </time>

        {isMine && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative ml-auto" aria-label="Post actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={startEditing}>
                <Pencil />
                Edit post
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>
                <Trash2 />
                Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="px-4 py-3">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              rows={3}
              aria-label="Edit post text"
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
              >
                Cancel
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {draft.length}/{MAX_LENGTH}
              </span>
            </div>
            <div className="space-y-1">
              <label htmlFor={`build-${thought._id}`} className="text-xs text-muted-foreground">
                Attached build
              </label>
              <select
                id={`build-${thought._id}`}
                value={draftBuildId}
                onChange={(event) => setDraftBuildId(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value={NO_BUILD}>No build attached</option>
                {/* The attached build may have been deleted, or belong to a page
                    of builds this account no longer lists. */}
                {thought.build && !myBuilds.some((one) => one._id === thought.build?._id) && (
                  <option value={thought.build._id}>{thought.build.name}</option>
                )}
                {myBuilds.map((build) => (
                  <option key={build._id} value={build._id}>
                    {build.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {thought.thoughtText}
          </p>
        )}

        {thought.build && showBuild && !editing && (
          <Link
            to={`/thought/${thought._id}`}
            className="relative mt-3 block overflow-hidden rounded-lg border border-border transition-colors hover:border-primary/50"
          >
            {thought.build.thumbnail && (
              <img src={thought.build.thumbnail} alt="" className="aspect-video w-full object-cover" />
            )}
            <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
              <Blocks className="size-3.5" />
              {thought.build.name}
            </span>
          </Link>
        )}
      </div>

      {showCommentsLink && (
      <footer className="border-t border-border px-2 py-1.5">
        <Button asChild variant="ghost" size="sm" className="relative text-muted-foreground">
          <Link to={`/thought/${thought._id}`}>
            <MessageSquare />
            {thought.reactionCount > 0
              ? `${thought.reactionCount} ${thought.reactionCount === 1 ? "comment" : "comments"}`
              : "Start the discussion"}
          </Link>
        </Button>
      </footer>
      )}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              The post and its comments are removed for everyone. The build itself is not
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                await deleteThought({ variables: { thoughtId: thought._id } });
                onDeleted?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
