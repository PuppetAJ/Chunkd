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

export interface FriendSummary {
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
