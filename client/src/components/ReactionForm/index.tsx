import { useState } from "react";
import { useMutation } from "@apollo/client/react";

import { ADD_REACTION } from "../../utils/mutations.ts";
import { requestErrorMessage } from "../../lib/credentials.ts";
import { useAuthStore } from "../../lib/auth.ts";
import { asReaction, PENDING_ID_PREFIX, type Reaction } from "../../lib/feedTypes.ts";
import { Button } from "../ui/button.tsx";
import { Textarea } from "../ui/textarea.tsx";

const MAX_LENGTH = 280;

interface Props {
  thoughtId: string;
  reactions: Reaction[];
  parentId?: string | null;
  mention?: string | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export default function ReactionForm({
  thoughtId,
  reactions,
  parentId = null,
  mention = null,
  onDone,
  onCancel,
}: Props) {
  const me = useAuthStore((state) => state.user?.username ?? "");
  const [reactionBody, setReactionBody] = useState(mention ? `@${mention} ` : "");
  const [submitError, setSubmitError] = useState("");
  const [addReaction, { loading }] = useMutation(ADD_REACTION);

  const replying = parentId !== null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = reactionBody.trim();
    if (!body) return;

    setSubmitError("");
    try {
      await addReaction({
        variables: { reactionBody: body, thoughtId, parentId },
        optimisticResponse: {
          addReaction: {
            __typename: "Thought",
            _id: thoughtId,
            reactionCount: reactions.length + 1,
            reactions: [
              ...reactions.map(asReaction),
              asReaction({
                _id: `${PENDING_ID_PREFIX}${Date.now()}`,
                reactionBody: body,
                createdAt: new Date().toISOString(),
                username: me,
                parent: parentId,
              }),
            ],
          },
        },
      });
      setReactionBody("");
      onDone?.();
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
    }
  };

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <Textarea
        rows={replying ? 2 : 3}
        autoFocus={replying}
        aria-label={replying ? "Write a reply" : "Write a comment"}
        placeholder={replying ? "Write a reply" : "What do you think?"}
        value={reactionBody}
        onChange={(event) => setReactionBody(event.target.value.slice(0, MAX_LENGTH))}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={loading || !reactionBody.trim()}>
          {loading ? "Posting..." : replying ? "Reply" : "Comment"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <span
          className={
            reactionBody.length === MAX_LENGTH
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {reactionBody.length}/{MAX_LENGTH}
        </span>
      </div>
      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
    </form>
  );
}
