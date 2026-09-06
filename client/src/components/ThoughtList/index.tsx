import { MessagesSquare } from "lucide-react";
import type { Thought } from "../../lib/feedTypes.ts";
import ThoughtCard from "../ThoughtCard/index.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

interface Props {
  thoughts: Thought[];
  loading?: boolean;
  showAuthor?: boolean;
  /** Shown in place of the list when there is nothing to show. */
  emptyTitle?: string;
  emptyBody?: string;
}

export default function ThoughtList({
  thoughts,
  loading = false,
  showAuthor = true,
  emptyTitle = "No posts yet",
  emptyBody = "Build something, then share it here.",
}: Props) {
  if (loading) return <ThoughtListSkeleton />;

  if (!thoughts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <MessagesSquare className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {thoughts.map((thought) => (
        <ThoughtCard key={thought._id} thought={thought} showAuthor={showAuthor} />
      ))}
    </div>
  );
}

/** Three post-shaped placeholders, so the page does not jump when data lands. */
function ThoughtListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((row) => (
        <div key={row} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
