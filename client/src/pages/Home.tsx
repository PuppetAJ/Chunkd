import { useEffect, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Loader2, Plus } from "lucide-react";

import { QUERY_THOUGHTS, QUERY_ME_BASIC } from "../utils/queries.ts";
import { useAuthStore } from "../lib/auth.ts";
import { FEED_PAGE_SIZE, type UserSummary, type Thought } from "../lib/feedTypes.ts";
import FollowList from "../components/FollowList/index.tsx";
import ThoughtList from "../components/ThoughtList/index.tsx";
import NewPostDialog from "../components/NewPostDialog/index.tsx";
import { Button } from "../components/ui/button.tsx";

interface MeBasic {
  username: string;
  followingCount: number;
  following: UserSummary[];
}

export default function Home() {
  const loggedIn = useAuthStore((state) => state.isLoggedIn);
  const [posting, setPosting] = useState(false);

  const { loading, data, fetchMore } = useQuery(QUERY_THOUGHTS, {
    variables: { limit: FEED_PAGE_SIZE, offset: 0 },
  });
  // Asking who "me" is only makes sense with a token to ask on behalf of.
  const { data: userData } = useQuery(QUERY_ME_BASIC, { skip: !loggedIn });

  const thoughts: Thought[] = (data as { thoughts?: Thought[] } | undefined)?.thoughts ?? [];
  const me = (userData as { me?: MeBasic } | undefined)?.me ?? null;

  // A short page that comes back means there is nothing after it, so the feed
  // stops asking. Without this the sentinel would fire forever at the bottom.
  const [reachedEnd, setReachedEnd] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || reachedEnd || loading) return;

    const observer = new IntersectionObserver(async (entries) => {
      if (!entries[0]?.isIntersecting) return;
      if (loadingMore) return;

      setLoadingMore(true);
      try {
        const result = await fetchMore({
          variables: { limit: FEED_PAGE_SIZE, offset: thoughts.length },
        });
        const page = (result.data as { thoughts?: Thought[] } | undefined)?.thoughts ?? [];
        if (page.length < FEED_PAGE_SIZE) setReachedEnd(true);
      } finally {
        setLoadingMore(false);
      }
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchMore, loading, loadingMore, reachedEnd, thoughts.length]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">Recent builds</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What everyone has been making lately.
            </p>
          </div>
          {loggedIn && (
            <Button onClick={() => setPosting(true)}>
              <Plus />
              New post
            </Button>
          )}
        </div>

        <ThoughtList
          thoughts={thoughts}
          loading={loading && thoughts.length === 0}
          emptyTitle="The feed is empty"
          emptyBody={
            loggedIn
              ? "Save a world in the editor, then share it here."
              : "Sign up to start building and posting."
          }
        />

        {/* Watched by the observer above: scrolling it into view loads the next
            page. It keeps a little height so it can be intersected at all. */}
        {thoughts.length > 0 && !reachedEnd && (
          <div ref={sentinel} className="flex justify-center py-8">
            {loadingMore && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </div>
        )}

        {reachedEnd && thoughts.length > 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            That is the whole feed.
          </p>
        )}
      </div>

      {/* The sidebar is only useful signed in, and on a narrow screen it drops
          below the feed rather than squeezing it. */}
      {loggedIn && me && (
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FollowList
            username={me.username}
            count={me.followingCount}
            people={me.following ?? []}
          />
        </aside>
      )}

      {loggedIn && <NewPostDialog open={posting} onOpenChange={setPosting} />}
    </div>
  );
}
