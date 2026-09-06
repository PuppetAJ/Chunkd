import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { useQuery, useMutation } from "@apollo/client/react";
import { Plus, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "../lib/auth.ts";
import { requestErrorMessage } from "../lib/credentials.ts";
import type { BuildSummary, UserSummary, Thought } from "../lib/feedTypes.ts";
import ThoughtList from "../components/ThoughtList/index.tsx";
import BuildGallery from "../components/BuildGallery/index.tsx";
import NewPostDialog from "../components/NewPostDialog/index.tsx";
import UserAvatar from "../components/UserAvatar.tsx";
import { QUERY_USER, QUERY_ME, QUERY_ME_BASIC } from "../utils/queries.ts";
import { FOLLOW, UNFOLLOW } from "../utils/mutations.ts";
import { Button } from "../components/ui/button.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Link } from "react-router";

interface ProfileUser {
  _id: string;
  username: string;
  followerCount: number;
  followingCount: number;
  followers?: UserSummary[];
  following?: UserSummary[];
  builds?: BuildSummary[];
  thoughts?: Thought[];
}

export default function Profile() {
  const { username: userParam } = useParams();
  const me = useAuthStore((state) => state.user);

  const [posting, setPosting] = useState(false);
  const [followError, setFollowError] = useState("");

  const viewingOwnProfile = Boolean(userParam) && me?.username === userParam;

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam },
    // Skipped while the redirect below is about to fire.
    skip: viewingOwnProfile,
  });

  // Whose list the button depends on: following someone puts them in *yours*,
  // so whether it says follow or unfollow is a question about you, not about
  // the profile being looked at. This used to read the profile owner's list,
  // which answered the opposite question and showed "Add friend" for people you
  // had already added.
  const { data: myData } = useQuery(QUERY_ME_BASIC, { skip: !userParam });
  const iFollow: UserSummary[] =
    (myData as { me?: { following?: UserSummary[] } } | undefined)?.me?.following ?? [];

  // Refetching the viewer's own record is what flips the button afterwards. The
  // profile itself is refetched too, because its follower count just changed.
  const followOptions = {
    refetchQueries: [{ query: QUERY_ME_BASIC }, { query: QUERY_USER, variables: { username: userParam } }],
  };
  const [follow, { loading: following }] = useMutation(FOLLOW, followOptions);
  const [unfollow, { loading: unfollowing }] = useMutation(UNFOLLOW, followOptions);

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
  const followers = user.followers ?? [];
  const followingList = user.following ?? [];

  const alreadyFollowing = iFollow.some((person) => person._id === user._id);
  const followPending = following || unfollowing;

  const handleFollowClick = async () => {
    setFollowError("");
    try {
      const variables = { id: user._id };
      if (alreadyFollowing) {
        await unfollow({ variables });
        toast.success(`Unfollowed ${user.username}`);
      } else {
        await follow({ variables });
        // Deliberately not "request sent": following is one-way and there is
        // nothing for them to accept. The message says what actually happened.
        toast.success(`You are now following ${user.username}`);
      }
    } catch (error) {
      const message = requestErrorMessage(error);
      setFollowError(message);
      toast.error(message);
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
              {countLabel(user.followerCount, "follower")} &middot;{" "}
              {user.followingCount} following
            </p>
          </div>

          <div className="sm:ml-auto">
            {isOwnProfile ? (
              <Button onClick={() => setPosting(true)}>
                <Plus />
                New post
              </Button>
            ) : (
              <Button
                variant={alreadyFollowing ? "outline" : "default"}
                disabled={followPending}
                onClick={handleFollowClick}
              >
                {alreadyFollowing ? <UserMinus /> : <UserPlus />}
                {followPending
                  ? alreadyFollowing
                    ? "Unfollowing..."
                    : "Following..."
                  : alreadyFollowing
                    ? "Unfollow"
                    : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {followError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {followError}
          </p>
        )}
      </header>

      <Tabs defaultValue="builds">
        <TabsList>
          <TabsTrigger value="builds">Builds</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
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

        <TabsContent value="followers" className="mt-4">
          <PeopleGrid
            people={followers}
            empty={
              isOwnProfile
                ? "Nobody is following you yet. Share a build and they will find you."
                : `Nobody is following ${user.username} yet.`
            }
          />
        </TabsContent>

        <TabsContent value="following" className="mt-4">
          <PeopleGrid
            people={followingList}
            empty={
              isOwnProfile
                ? "Open someone's profile to follow them."
                : `${user.username} isn't following anyone yet.`
            }
          />
        </TabsContent>

      </Tabs>

      {isOwnProfile && <NewPostDialog open={posting} onOpenChange={setPosting} />}
    </div>
  );
}

/**
 * A list of people, used by both the followers and the following tabs.
 *
 * The two differ only in where the list came from, so they share one component
 * rather than two near-identical blocks of markup.
 */
function PeopleGrid({ people, empty }: { people: UserSummary[]; empty: string }) {
  if (people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <li key={person._id}>
          <Link
            to={`/profile/${person.username}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50"
          >
            <UserAvatar username={person.username} size="md" />
            <span className="truncate text-sm font-medium">{person.username}</span>
          </Link>
        </li>
      ))}
    </ul>
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
