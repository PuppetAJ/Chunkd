import { Types } from "mongoose";
import {
  Build,
  Thought,
  User,
  CURRENT_BUILD_FORMAT,
  type BuildDocument,
  type ReactionSubdocument,
  type ThoughtDocument,
  type UserDocument,
} from "../models/index.ts";
import {
  badRequest,
  forbidden,
  notFound,
  requireAuth,
  signToken,
  type GraphQLContext,
} from "../utils/auth.ts";

// A saved world is a few kilobytes in the compact format. This ceiling is a
// safety net against a bug or a malicious client, not a real design limit.
const MAX_BUILD_BYTES = 512 * 1024;
const MAX_THUMBNAIL_BYTES = 256 * 1024;

function toObjectId(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw badRequest(`${label} is not a valid id.`);
  }
  return new Types.ObjectId(value);
}

export const resolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const auth = requireAuth(context);
      return User.findById(auth._id);
    },

    users: async () => User.find().sort({ createdAt: -1 }),

    user: async (_parent: unknown, args: { username: string }) =>
      User.findOne({ username: args.username }),

    thoughts: async (_parent: unknown, args: { username?: string | null }) => {
      // Filtering by username means one extra lookup, because thoughts store the
      // author's id rather than a copy of their name.
      if (args.username) {
        const author = await User.findOne({ username: args.username }).select("_id");
        if (!author) return [];
        return Thought.find({ author: author._id }).sort({ createdAt: -1 });
      }
      return Thought.find().sort({ createdAt: -1 });
    },

    thought: async (_parent: unknown, args: { _id: string }) =>
      Thought.findById(toObjectId(args._id, "Thought id")),

    build: async (_parent: unknown, args: { _id: string }) =>
      Build.findById(toObjectId(args._id, "Build id")),
  },

  // ---- Field resolvers -------------------------------------------------
  // These run only when a query actually asks for the field, so listing the
  // feed does not drag down every friend and build of every author.

  User: {
    friendCount: (parent: UserDocument) => parent.friends.length,

    friends: async (parent: UserDocument) => User.find({ _id: { $in: parent.friends } }),

    thoughts: async (parent: UserDocument) =>
      Thought.find({ author: parent._id }).sort({ createdAt: -1 }),

    builds: async (parent: UserDocument) =>
      Build.find({ owner: parent._id })
        .select("_id name thumbnail createdAt")
        .sort({ createdAt: -1 }),

    // An email address is not public. Return it only to its owner.
    email: (parent: UserDocument, _args: unknown, context: GraphQLContext) =>
      context.user && context.user._id === parent._id.toString() ? parent.email : null,

    createdAt: (parent: UserDocument) => parent.createdAt.toISOString(),
  },

  Thought: {
    author: async (parent: ThoughtDocument) => User.findById(parent.author),

    username: async (parent: ThoughtDocument) => {
      const author = await User.findById(parent.author).select("username");
      return author?.username ?? "[deleted]";
    },

    build: async (parent: ThoughtDocument) =>
      parent.build
        ? Build.findById(parent.build).select("_id name thumbnail createdAt")
        : null,

    reactionCount: (parent: ThoughtDocument) => parent.reactions.length,

    createdAt: (parent: ThoughtDocument) => parent.createdAt.toISOString(),
  },

  Reaction: {
    author: async (parent: ReactionSubdocument) => User.findById(parent.author),

    username: async (parent: ReactionSubdocument) => {
      const author = await User.findById(parent.author).select("username");
      return author?.username ?? "[deleted]";
    },

    createdAt: (parent: ReactionSubdocument) => parent.createdAt.toISOString(),
  },

  Build: {
    owner: async (parent: BuildDocument) => User.findById(parent.owner),
    createdAt: (parent: BuildDocument) => parent.createdAt.toISOString(),
  },

  BuildSummary: {
    createdAt: (parent: BuildDocument) => parent.createdAt.toISOString(),
  },

  // ---- Mutations -------------------------------------------------------

  Mutation: {
    addUser: async (
      _parent: unknown,
      args: { username: string; email: string; password: string },
    ) => {
      try {
        const user = await User.create(args);
        return { token: signToken(user), user };
      } catch (error) {
        // Mongo reports a unique-index collision as error code 11000. Without
        // this the client saw a raw driver error mentioning the index name.
        if (error && typeof error === "object" && "code" in error && error.code === 11000) {
          throw badRequest("That username or email address is already taken.");
        }
        throw error;
      }
    },

    login: async (_parent: unknown, args: { email: string; password: string }) => {
      const user = await User.findOne({ email: args.email.toLowerCase() });

      // Deliberately the same message for "no such user" and "wrong password",
      // so the endpoint cannot be used to discover which emails are registered.
      const failure = badRequest("Incorrect email address or password.");
      if (!user) throw failure;
      if (!(await user.isCorrectPassword(args.password))) throw failure;

      return { token: signToken(user), user };
    },

    addThought: async (
      _parent: unknown,
      args: { thoughtText: string; buildId?: string | null },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);

      let build: Types.ObjectId | undefined;
      if (args.buildId) {
        const buildId = toObjectId(args.buildId, "Build id");
        const owned = await Build.findOne({ _id: buildId, owner: auth._id }).select("_id");
        if (!owned) throw forbidden("You can only post a build that you own.");
        build = buildId;
      }

      return Thought.create({
        author: new Types.ObjectId(auth._id),
        thoughtText: args.thoughtText,
        build,
      });
    },

    updateThought: async (
      _parent: unknown,
      args: { thoughtId: string; thoughtText: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const thought = await Thought.findById(toObjectId(args.thoughtId, "Thought id"));

      if (!thought) throw notFound("That post no longer exists.");
      if (thought.author.toString() !== auth._id) {
        throw forbidden("You can only edit your own posts.");
      }

      thought.thoughtText = args.thoughtText;
      await thought.save();
      return thought;
    },

    deleteThought: async (
      _parent: unknown,
      args: { thoughtId: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const thought = await Thought.findById(toObjectId(args.thoughtId, "Thought id"));

      if (!thought) throw notFound("That post no longer exists.");
      if (thought.author.toString() !== auth._id) {
        throw forbidden("You can only delete your own posts.");
      }

      // `document.delete()` was removed from Mongoose years ago.
      await thought.deleteOne();
      return args.thoughtId;
    },

    addReaction: async (
      _parent: unknown,
      args: { thoughtId: string; reactionBody: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const thought = await Thought.findByIdAndUpdate(
        toObjectId(args.thoughtId, "Thought id"),
        {
          $push: {
            reactions: {
              reactionBody: args.reactionBody,
              author: new Types.ObjectId(auth._id),
            },
          },
        },
        { new: true, runValidators: true },
      );

      if (!thought) throw notFound("That post no longer exists.");
      return thought;
    },

    deleteReaction: async (
      _parent: unknown,
      args: { thoughtId: string; reactionId: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const thought = await Thought.findById(toObjectId(args.thoughtId, "Thought id"));
      if (!thought) throw notFound("That post no longer exists.");

      const reaction = thought.reactions.id(args.reactionId);
      if (!reaction) throw notFound("That comment no longer exists.");

      // Either the comment's author or the owner of the post can remove it.
      const isCommentAuthor = reaction.author.toString() === auth._id;
      const isThreadOwner = thought.author.toString() === auth._id;
      if (!isCommentAuthor && !isThreadOwner) {
        throw forbidden("You can only delete your own comments.");
      }

      reaction.deleteOne();
      await thought.save();
      return thought;
    },

    addFriend: async (
      _parent: unknown,
      args: { friendId: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const friendId = toObjectId(args.friendId, "Friend id");

      if (friendId.toString() === auth._id) {
        throw badRequest("You cannot add yourself as a friend.");
      }

      const friendExists = await User.exists({ _id: friendId });
      if (!friendExists) throw notFound("That user no longer exists.");

      const user = await User.findByIdAndUpdate(
        auth._id,
        { $addToSet: { friends: friendId } },
        { new: true },
      );
      if (!user) throw notFound("Your account no longer exists.");
      return user;
    },

    // This existed only as a commented-out block in the original resolvers.
    deleteFriend: async (
      _parent: unknown,
      args: { friendId: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const user = await User.findByIdAndUpdate(
        auth._id,
        { $pull: { friends: toObjectId(args.friendId, "Friend id") } },
        { new: true },
      );
      if (!user) throw notFound("Your account no longer exists.");
      return user;
    },

    saveBuild: async (
      _parent: unknown,
      args: { name?: string | null; data: string; thumbnail?: string | null },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);

      if (Buffer.byteLength(args.data, "utf8") > MAX_BUILD_BYTES) {
        throw badRequest("That build is too large to save.");
      }
      if (args.thumbnail && Buffer.byteLength(args.thumbnail, "utf8") > MAX_THUMBNAIL_BYTES) {
        throw badRequest("That build's preview image is too large.");
      }

      return Build.create({
        owner: new Types.ObjectId(auth._id),
        name: args.name?.trim() || "Untitled build",
        format: CURRENT_BUILD_FORMAT,
        data: args.data,
        thumbnail: args.thumbnail ?? undefined,
      });
    },

    deleteBuild: async (
      _parent: unknown,
      args: { buildId: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const buildId = toObjectId(args.buildId, "Build id");
      const build = await Build.findById(buildId);

      if (!build) throw notFound("That build no longer exists.");
      if (build.owner.toString() !== auth._id) {
        throw forbidden("You can only delete your own builds.");
      }

      // Posts that showed this build keep their text but lose the attachment.
      await Thought.updateMany({ build: buildId }, { $unset: { build: "" } });
      await build.deleteOne();
      return args.buildId;
    },
  },
};
