import { Link } from "react-router";
import { Users } from "lucide-react";
import type { UserSummary } from "../../lib/feedTypes.ts";
import UserAvatar from "../UserAvatar.tsx";

interface Props {
  /** Whose list this is, for the sentence shown when it is empty. */
  username: string;
  count: number;
  people: UserSummary[];
}

/**
 * The sidebar list of people someone follows.
 *
 * Following is one-way: adding someone puts them in your list and asks nothing
 * of them. This replaces a "friends" list that behaved that way already but was
 * named as though both sides had agreed to it.
 */
export default function FollowList({ username, count, people }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4 text-muted-foreground" />
        Following {count}
      </h2>

      {people.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {username} isn&apos;t following anyone yet. Open someone&apos;s profile to follow them.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {people.map((person) => (
            <li key={person._id}>
              <Link
                to={`/profile/${person.username}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <UserAvatar username={person.username} size="sm" />
                <span className="truncate">{person.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
