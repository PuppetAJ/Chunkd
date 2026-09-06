import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Plus } from "lucide-react";

import { QUERY_THOUGHTS, QUERY_ME_BASIC } from "../utils/queries.ts";
import { useAuthStore } from "../lib/auth.ts";
import type { FriendSummary, Thought } from "../lib/feedTypes.ts";
import FriendList from "../components/FriendList/index.tsx";
import ThoughtList from "../components/ThoughtList/index.tsx";
import NewPostDialog from "../components/NewPostDialog/index.tsx";
import { Button } from "../components/ui/button.tsx";

interface MeBasic {
  username: string;
  friendCount: number;
  friends: FriendSummary[];
}

export default function Home() {
  const loggedIn = useAuthStore((state) => state.isLoggedIn);
  const [posting, setPosting] = useState(false);

  const { loading, data } = useQuery(QUERY_THOUGHTS);
  // Asking who "me" is only makes sense with a token to ask on behalf of.
  const { data: userData } = useQuery(QUERY_ME_BASIC, { skip: !loggedIn });

  const thoughts: Thought[] = (data as { thoughts?: Thought[] } | undefined)?.thoughts ?? [];
  const me = (userData as { me?: MeBasic } | undefined)?.me ?? null;

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
          loading={loading}
          emptyTitle="The feed is empty"
          emptyBody={
            loggedIn
              ? "Save a world in the editor, then share it here."
              : "Sign up to start building and posting."
          }
        />
      </div>

      {/* The sidebar is only useful signed in, and on a narrow screen it drops
          below the feed rather than squeezing it. */}
      {loggedIn && me && (
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FriendList
            username={me.username}
            friendCount={me.friendCount}
            friends={me.friends ?? []}
          />
        </aside>
      )}

      {loggedIn && <NewPostDialog open={posting} onOpenChange={setPosting} />}
    </div>
  );
}
