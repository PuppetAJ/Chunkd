/**
 * Hand-written shapes for what utils/queries.ts asks for; there is no codegen.
 * Optional fields are the ones some queries leave out.
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
  updatedAt?: string;
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
 * An optimistic response is ignored, silently, unless every object in it names
 * its type and carries every field the mutation asked for.
 */
export function asReaction(reaction: Reaction) {
  return {
    __typename: "Reaction",
    _id: reaction._id,
    reactionBody: reaction.reactionBody,
    createdAt: reaction.createdAt,
    username: reaction.username,
  };
}

/** A comment that only exists optimistically, until the server gives it a real id. */
export function isPending(reaction: Reaction): boolean {
  return reaction._id.startsWith("temp-");
}

/** Shared with the new-post dialog, which prepends to the same first page. */
export const FEED_PAGE_SIZE = 10;

/** Must match server/src/config/demo.ts. */
export const DEMO_USERNAME = "demo";
