import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@apollo/client/react";
import { ChevronLeft } from "lucide-react";

import { QUERY_THOUGHT } from "../utils/queries.ts";
import { useAuthStore } from "../lib/auth.ts";
import type { Thought } from "../lib/feedTypes.ts";
import ThoughtCard from "../components/ThoughtCard/index.tsx";
import ReactionList from "../components/ReactionList/index.tsx";
import ReactionForm from "../components/ReactionForm/index.tsx";
import SavedBuild from "../components/SavedBuild/index.tsx";
import { Button } from "../components/ui/button.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";

export default function SingleThought() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const navigate = useNavigate();
  const { id: thoughtId } = useParams();

  const { loading, data } = useQuery(QUERY_THOUGHT, { variables: { id: thoughtId } });
  const thought = (data as { thought?: Thought } | undefined)?.thought ?? null;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!thought) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-medium">That post no longer exists.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/">Back to the feed</Link>
        </Button>
      </div>
    );
  }

  const reactions = thought.reactions ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/">
          <ChevronLeft />
          Back to the feed
        </Link>
      </Button>

      {/* The attached world is the point of the post, so it leads. */}
      {thought.build && (
        <div className="h-80">
          <SavedBuild buildId={thought.build._id} />
        </div>
      )}

      <ThoughtCard
        thought={thought}
        showCommentsLink={false}
        onDeleted={() => navigate("/", { replace: true })}
      />

      <section className="rounded-xl border border-border bg-card px-4 py-3">
        <h2 className="text-sm font-semibold">
          {reactions.length} {reactions.length === 1 ? "comment" : "comments"}
        </h2>
        <ReactionList thoughtId={thought._id} reactions={reactions} />
        {isLoggedIn ? (
          <div className="border-t border-border pt-3">
            <ReactionForm thoughtId={thought._id} />
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline underline-offset-2">
              Log in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
      </section>
    </div>
  );
}
