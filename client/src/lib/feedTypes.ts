/**
 * The shapes the feed components expect.
 *
 * GraphQL results arrive from Apollo untyped, so these interfaces exist to
 * describe what the queries in utils/queries.ts actually ask for. They are
 * hand-written on purpose: there is no code generation step to keep in sync,
 * and a component that reads `thought.username` should fail to compile if that
 * field is ever dropped from the query.
 *
 * Fields marked optional are the ones a given query may leave out, not fields
 * the server might omit at random.
 */

/** Enough of a user to link to them and draw their avatar. */
export interface UserSummary {
  _id: string;
  username: string;
}

export interface BuildSummary {
  _id: string;
  name: string;
  thumbnail?: string | null;
  createdAt?: string;
}

export interface Reaction {
  _id: string;
  reactionBody: string;
  createdAt: string;
  username: string;
}

export interface Thought {
  _id: string;
  thoughtText: string;
  createdAt: string;
  /** The feed asks for this; the profile page already knows whose posts these are. */
  username?: string;
  reactionCount: number;
  build?: BuildSummary | null;
  reactions?: Reaction[];
}

/**
 * How many posts the feed asks for at a time.
 *
 * Lives here rather than in the page, because the dialog that creates a post
 * has to refetch the same first page and the two must agree on its size.
 */
export const FEED_PAGE_SIZE = 10;

/**
 * The username of the shared demo account. It has to match
 * server/src/config/demo.ts. The landing page keeps this account's posts off
 * the front door, because that page is the one a visitor sees without signing
 * in and it should show curated builds rather than whatever the last stranger
 * typed.
 */
export const DEMO_USERNAME = "demo";
