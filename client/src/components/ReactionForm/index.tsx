import { useState } from "react";
import { useMutation } from "@apollo/client/react";

import { ADD_REACTION } from "../../utils/mutations.ts";
import { requestErrorMessage } from "../../lib/credentials.ts";
import { Button } from "../ui/button.tsx";
import { Textarea } from "../ui/textarea.tsx";

const MAX_LENGTH = 280;

interface Props {
  thoughtId: string;
}

export default function ReactionForm({ thoughtId }: Props) {
  const [reactionBody, setReactionBody] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [addReaction, { loading }] = useMutation(ADD_REACTION);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = reactionBody.trim();
    if (!body) return;

    setSubmitError("");
    try {
      await addReaction({ variables: { reactionBody: body, thoughtId } });
      setReactionBody("");
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
    }
  };

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <Textarea
        rows={3}
        aria-label="Write a comment"
        placeholder="What do you think?"
        value={reactionBody}
        onChange={(event) => setReactionBody(event.target.value.slice(0, MAX_LENGTH))}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={loading || !reactionBody.trim()}>
          {loading ? "Posting..." : "Comment"}
        </Button>
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
