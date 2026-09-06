import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus, UserMinus, UserPlus } from "lucide-react";

import { useAuthStore } from "../lib/auth.ts";
import { requestErrorMessage } from "../lib/credentials.ts";
import type { BuildSummary, FriendSummary, Thought } from "../lib/feedTypes.ts";
import ThoughtList from "../components/ThoughtList/index.tsx";
import BuildGallery from "../components/BuildGallery/index.tsx";
import NewPostDialog from "../components/NewPostDialog/index.tsx";
import UserAvatar from "../components/UserAvatar.tsx";
import { QUERY_USER, QUERY_ME } from "../utils/queries.ts";
import { ADD_FRIEND, DELETE_FRIEND } from "../utils/mutations.ts";
import { Button } from "../components/ui/button.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Link } from "react-router";

interface ProfileUser {
  _id: string;
  username: string;
  friendCount: number;
  friends?: FriendSummary[];
  builds?: BuildSummary[];
  thoughts?: Thought[];
}

export default function Profile() {
  const { username: userParam } = useParams();
  const me = useAuthStore((state) => state.user);

  const [posting, setPosting] = useState(false);
  const [friendError, setFriendError] = useState("");

  const viewingOwnProfile = Boolean(userParam) && me?.username === userParam;

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam },
    // Skipped while the redirect below is about to fire.
    skip: viewingOwnProfile,
  });

  const [addFriend] = useMutation(ADD_FRIEND);
  const [deleteFriend] = useMutation(DELETE_FRIEND);

  // Visiting your own username lands you on your own profile page instead of
  // the read-only "someone else" view.
  if (viewingOwnProfile) return <Navigate to="/profile" replace />;

  if (loading) return <ProfileSkeleton />;

  const result = data as { me?: ProfileUser; user?: ProfileUser } | undefined;
  const user = result?.me ?? result?.user ?? null;

  if (!user?.username) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-medium">We couldn&apos;t find that profile.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/">Back to the feed</Link>
        </Button>
      </div>
    );
  }

  const isOwnProfile = !userParam;
  const builds = user.builds ?? [];
  const thoughts = user.thoughts ?? [];
  const friends = user.friends ?? [];

  // QUERY_ME returns the viewer's own friend list, so this is only meaningful
  // on someone else's profile, which is exactly where the button is shown.
  const alreadyFriends = Boolean(
    userParam && me && friends.some((friend) => friend._id === me._id),
  );

  const handleFriendClick = async () => {
    setFriendError("");
    try {
      const variables = { id: user._id };
      if (alreadyFriends) await deleteFriend({ variables });
      else await addFriend({ variables });
    } catch (error) {
      setFriendError(requestErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar username={user.username} size="lg" />

          <div className="min-w-0">
            <h1 className="font-display text-2xl break-words">{user.username}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {countLabel(builds.length, "build")} &middot;{" "}
              {countLabel(thoughts.length, "post")} &middot;{" "}
              {countLabel(user.friendCount, "friend")}
            </p>
          </div>

          <div className="sm:ml-auto">
            {isOwnProfile ? (
              <Button onClick={() => setPosting(true)}>
                <Plus />
                New post
              </Button>
            ) : (
              <Button variant={alreadyFriends ? "outline" : "default"} onClick={handleFriendClick}>
                {alreadyFriends ? <UserMinus /> : <UserPlus />}
                {alreadyFriends ? "Remove friend" : "Add friend"}
              </Button>
            )}
          </div>
        </div>

        {friendError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {friendError}
          </p>
        )}
      </header>

      <Tabs defaultValue="builds">
        <TabsList>
          <TabsTrigger value="builds">Builds</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="builds" className="mt-4">
          <BuildGallery
            builds={builds}
            canManage={isOwnProfile}
            emptyBody={
              isOwnProfile
                ? "Press P in the editor to save the world you are standing in."
                : `${user.username} hasn't saved any worlds yet.`
            }
          />
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <ThoughtList
            thoughts={thoughts}
            showAuthor={false}
            emptyTitle="No posts yet"
            emptyBody={
              isOwnProfile
                ? "Share a build and it will show up here."
                : `${user.username} hasn't posted anything yet.`
            }
          />
        </TabsContent>

        <TabsContent value="friends" className="mt-4">
          {friends.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              {isOwnProfile
                ? "Open someone's profile to add them as a friend."
                : `${user.username} hasn't added any friends yet.`}
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <li key={friend._id}>
                  <Link
                    to={`/profile/${friend.username}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50"
                  >
                    <UserAvatar username={friend.username} size="md" />
                    <span className="truncate text-sm font-medium">{friend.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {isOwnProfile && <NewPostDialog open={posting} onOpenChange={setPosting} />}
    </div>
  );
}

function countLabel(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
