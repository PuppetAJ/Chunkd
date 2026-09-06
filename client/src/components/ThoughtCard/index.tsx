import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "@apollo/client/react";
import { Blocks, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { UPDATE_THOUGHT, DELETE_THOUGHT } from "../../utils/mutations.ts";
import { QUERY_THOUGHTS, QUERY_ME } from "../../utils/queries.ts";
import { formatTimestamp } from "../../lib/formatTimestamp.ts";
import { useAuthStore } from "../../lib/auth.ts";
import type { Thought } from "../../lib/feedTypes.ts";
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

interface Props {
  thought: Thought;
  /** The profile page already says whose posts these are. */
  showAuthor?: boolean;
  /** The post's own page has the comments below it, so the link is pointless there. */
  showCommentsLink?: boolean;
  /** Lets the post's own page navigate away once the post is gone. */
  onDeleted?: () => void;
}

/**
 * One post in the feed.
 *
 * The author gets an edit and a delete action here. Editing happens in place
 * rather than in a dialog: the post is already the right size and shape to type
 * into, and a dialog would hide the thing being edited.
 */
export default function ThoughtCard({
  thought,
  showAuthor = true,
  showCommentsLink = true,
  onDeleted,
}: Props) {
  const me = useAuthStore((state) => state.user?.username ?? "");
  const author = thought.username ?? me;
  const isMine = Boolean(me) && author === me;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thought.thoughtText);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [updateThought, { loading: saving }] = useMutation(UPDATE_THOUGHT);
  const [deleteThought, { loading: deleting }] = useMutation(DELETE_THOUGHT, {
    // The post disappears from both lists it can appear in, so the simplest
    // correct thing is to refetch them rather than surgically edit the cache.
    refetchQueries: [{ query: QUERY_THOUGHTS }, { query: QUERY_ME }],
  });

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || text === thought.thoughtText) {
      setEditing(false);
      setDraft(thought.thoughtText);
      return;
    }
    await updateThought({ variables: { thoughtId: thought._id, thoughtText: text } });
    setEditing(false);
  };

  return (
    <article className="rounded-xl border border-border bg-card transition-colors hover:border-border/80">
      <header className="flex items-center gap-3 px-4 pt-4">
        {showAuthor ? (
          <Link to={`/profile/${author}`} className="flex items-center gap-2.5 group">
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
              <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Post actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)}>
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
                onClick={() => {
                  setEditing(false);
                  setDraft(thought.thoughtText);
                }}
              >
                Cancel
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {draft.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {thought.thoughtText}
          </p>
        )}

        {thought.build && !editing && (
          <Link
            to={`/thought/${thought._id}`}
            className="mt-3 block overflow-hidden rounded-lg border border-border transition-colors hover:border-primary/50"
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
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
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
