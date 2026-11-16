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
  parent?: string | null;
}

export interface Thought {
  _id: string;
  thoughtText: string;
  createdAt: string;
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
    parent: reaction.parent ?? null,
  };
}

export const PENDING_ID_PREFIX = "temp-";

export function isPending(reaction: Reaction): boolean {
  return reaction._id.startsWith(PENDING_ID_PREFIX);
}

export const FEED_PAGE_SIZE = 10;

export const DEMO_USERNAME = "demo";
