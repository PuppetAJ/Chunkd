import { Link } from "react-router";
import { Users } from "lucide-react";
import type { FriendSummary } from "../../lib/feedTypes.ts";
import UserAvatar from "../UserAvatar.tsx";

interface Props {
  username: string;
  friendCount: number;
  friends: FriendSummary[];
}

export default function FriendList({ username, friendCount, friends }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4 text-muted-foreground" />
        {friendCount} {friendCount === 1 ? "friend" : "friends"}
      </h2>

      {friends.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {username} hasn&apos;t added any friends yet. Open someone&apos;s profile to add them.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {friends.map((friend) => (
            <li key={friend._id}>
              <Link
                to={`/profile/${friend.username}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <UserAvatar username={friend.username} size="sm" />
                <span className="truncate">{friend.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
