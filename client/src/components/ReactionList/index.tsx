import { Link } from "react-router";
import { useMutation } from "@apollo/client/react";
import { Trash2 } from "lucide-react";

import { DELETE_REACTION } from "../../utils/mutations.ts";
import { formatTimestamp } from "../../lib/formatTimestamp.ts";
import { useAuthStore } from "../../lib/auth.ts";
import type { Reaction } from "../../lib/feedTypes.ts";
import UserAvatar from "../UserAvatar.tsx";
import { Button } from "../ui/button.tsx";

interface Props {
  thoughtId: string;
  reactions: Reaction[];
}

/**
 * The comments under a post.
 *
 * The delete button appears on your own comments. The mutation returns the
 * post with its remaining reactions, and Apollo matches that on `_id`, so the
 * list updates from the response with no refetch.
 */
export default function ReactionList({ thoughtId, reactions }: Props) {
  const me = useAuthStore((state) => state.user?.username ?? "");
  const [deleteReaction, { loading }] = useMutation(DELETE_REACTION);

  if (reactions.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No comments yet. Be the first.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {reactions.map((reaction) => (
        <li key={reaction._id} className="flex items-start gap-3 py-3">
          <UserAvatar username={reaction.username} size="sm" className="mt-0.5" />
          <div className="min-w-0 grow">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <Link
                to={`/profile/${reaction.username}`}
                className="text-sm font-medium hover:underline"
              >
                {reaction.username}
              </Link>
              <time className="text-xs text-muted-foreground" dateTime={reaction.createdAt}>
                {formatTimestamp(reaction.createdAt)}
              </time>
            </p>
            <p className="mt-1 text-sm break-words whitespace-pre-wrap">{reaction.reactionBody}</p>
          </div>

          {reaction.username === me && (
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={loading}
              aria-label="Delete comment"
              className="text-muted-foreground hover:text-destructive"
              onClick={() =>
                deleteReaction({ variables: { thoughtId, reactionId: reaction._id } })
              }
            >
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
