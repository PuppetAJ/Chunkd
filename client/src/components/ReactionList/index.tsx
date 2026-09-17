import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "@apollo/client/react";
import { Pencil, Reply, Trash2 } from "lucide-react";

import { DELETE_REACTION, UPDATE_REACTION } from "../../utils/mutations.ts";
import { formatTimestamp } from "../../lib/formatTimestamp.ts";
import { useAuthStore } from "../../lib/auth.ts";
import { asReaction, isPending, type Reaction } from "../../lib/feedTypes.ts";
import UserAvatar from "../UserAvatar.tsx";
import ReactionForm from "../ReactionForm/index.tsx";
import { Button } from "../ui/button.tsx";
import { Textarea } from "../ui/textarea.tsx";

const MAX_LENGTH = 280;

interface Props {
  thoughtId: string;
  reactions: Reaction[];
}

/**
 * The comments under a post, one level of replies deep. Every mutation returns
 * the post with its remaining comments, which Apollo matches on `_id`, so none
 * of them needs a refetch.
 */
export default function ReactionList({ thoughtId, reactions }: Props) {
  const me = useAuthStore((state) => state.user?.username ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const [deleteReaction, { loading: deleting }] = useMutation(DELETE_REACTION);
  const [updateReaction] = useMutation(UPDATE_REACTION);

  if (reactions.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No comments yet. Be the first.
      </p>
    );
  }

  const roots = reactions.filter((one) => !one.parent);
  const repliesTo = (id: string) => reactions.filter((one) => one.parent === id);

  // Replies all sit at one level, so answering one only reads as a reply to it
  // if the name is in the text. Answering the comment at the top needs no name.
  const mentionFor = (id: string | null) => {
    const target = reactions.find((one) => one._id === id);
    return target?.parent ? target.username : null;
  };

  const remove = (reaction: Reaction) => {
    // The server takes a comment's replies with it, so the optimistic copy must too.
    const gone = new Set([reaction._id, ...repliesTo(reaction._id).map((one) => one._id)]);
    const left = reactions.filter((one) => !gone.has(one._id));
    return deleteReaction({
      variables: { thoughtId, reactionId: reaction._id },
      optimisticResponse: {
        deleteReaction: {
          __typename: "Thought",
          _id: thoughtId,
          reactionCount: left.length,
          reactions: left.map(asReaction),
        },
      },
    });
  };

  const saveEdit = (reaction: Reaction, body: string) =>
    updateReaction({
      variables: { thoughtId, reactionId: reaction._id, reactionBody: body },
      optimisticResponse: {
        updateReaction: {
          __typename: "Thought",
          _id: thoughtId,
          reactionCount: reactions.length,
          reactions: reactions.map((one) =>
            asReaction(one._id === reaction._id ? { ...one, reactionBody: body } : one),
          ),
        },
      },
    });

  const comment = (reaction: Reaction) => (
    <Comment
      key={reaction._id}
      reaction={reaction}
      mine={reaction.username === me}
      editing={editing === reaction._id}
      busy={deleting}
      onEdit={() => setEditing(reaction._id)}
      onCancelEdit={() => setEditing(null)}
      onSave={async (body) => {
        await saveEdit(reaction, body);
        setEditing(null);
      }}
      onReply={() => setReplyingTo(reaction._id)}
      onDelete={() => remove(reaction)}
    />
  );

  return (
    <ul className="divide-y divide-border">
      {roots.map((root) => {
        const replies = repliesTo(root._id);
        // A reply box opened under a reply belongs to the thread, not to that reply.
        const openHere = replyingTo === root._id || replies.some((one) => one._id === replyingTo);
        return (
          <li key={root._id} className="py-3">
            {comment(root)}

            {(replies.length > 0 || openHere) && (
              <ul className="mt-2 ml-5 space-y-2 border-l border-border pl-4">
                {replies.map((reply) => (
                  <li key={reply._id}>{comment(reply)}</li>
                ))}
                {openHere && (
                  <li className="pt-1">
                    <ReactionForm
                      // Remounts when the target changes, so the mention follows it.
                      key={replyingTo}
                      thoughtId={thoughtId}
                      reactions={reactions}
                      parentId={root._id}
                      mention={mentionFor(replyingTo)}
                      onDone={() => setReplyingTo(null)}
                      onCancel={() => setReplyingTo(null)}
                    />
                  </li>
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface CommentProps {
  reaction: Reaction;
  mine: boolean;
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (body: string) => void | Promise<void>;
  onReply: () => void;
  onDelete: () => void;
}

/** One comment, whether it sits at the top of a thread or inside one. */
function Comment({
  reaction,
  mine,
  editing,
  busy,
  onEdit,
  onCancelEdit,
  onSave,
  onReply,
  onDelete,
}: CommentProps) {
  const [draft, setDraft] = useState(reaction.reactionBody);
  // Nothing can be done to a comment the server has not acknowledged yet.
  const pending = isPending(reaction);

  return (
    <div className="flex items-start gap-3">
      <UserAvatar username={reaction.username} size="sm" className="mt-0.5" />
      <div className="min-w-0 grow">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <Link to={`/profile/${reaction.username}`} className="text-sm font-medium hover:underline">
            {reaction.username}
          </Link>
          <time className="text-xs text-muted-foreground" dateTime={reaction.createdAt}>
            {formatTimestamp(reaction.createdAt)}
          </time>
        </p>

        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={draft}
              rows={2}
              autoFocus
              aria-label="Edit comment"
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!draft.trim() || draft.trim() === reaction.reactionBody}
                onClick={() => void onSave(draft.trim())}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(reaction.reactionBody);
                  onCancelEdit();
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
          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{reaction.reactionBody}</p>
        )}

        {!editing && !pending && (
          <div className="mt-1 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={onReply}
            >
              <Reply />
              Reply
            </Button>
            {mine && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setDraft(reaction.reactionBody);
                  onEdit();
                }}
              >
                <Pencil />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {mine && !editing && (
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={busy || pending}
          aria-label="Delete comment"
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
