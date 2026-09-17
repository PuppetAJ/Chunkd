import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Types, type HydratedDocument } from "mongoose";
import { DEMO_EMAIL, DEMO_USERNAME } from "../config/demo.ts";
import { attemptLimiter } from "../utils/attemptLimiter.ts";
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
  asUserInputError,
  badRequest,
  forbidden,
  notFound,
  requireAuth,
  signToken,
  type GraphQLContext,
} from "../utils/auth.ts";

// A save is a few kilobytes, a few hundred at most. A safety net, not a design limit.
const MAX_BUILD_BYTES = 2 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 256 * 1024;

const DEFAULT_FEED_LIMIT = 10;
/** The hero plus two rows of three. */
const SHOWCASE_SIZE = 7;
const MAX_FEED_LIMIT = 50;

function feedWindow(args: { limit?: number | null; offset?: number | null }) {
  const limit = Math.min(Math.max(args.limit ?? DEFAULT_FEED_LIMIT, 1), MAX_FEED_LIMIT);
  const offset = Math.max(args.offset ?? 0, 0);
  return { limit, offset };
}

// Per-address limits on the ways to obtain a token, on top of the general limiter in server.ts.
const limitLogin = attemptLimiter("sign-in", 20, 15 * 60_000);
const limitSignup = attemptLimiter("sign-up", 60, 60 * 60_000);
const limitDemo = attemptLimiter("demo sign-in", 30, 60 * 60_000);

// Compared against when the email is unknown, so timing does not reveal which
// addresses are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// Stops one script filling the database between resets.
const MAX_BUILDS_PER_USER = 50;

interface BuildPayload {
  name?: string | null;
  data: string;
  thumbnail?: string | null;
  format?: number | null;
}

function checkBuildPayload(args: BuildPayload): void {
  if (Buffer.byteLength(args.data, "utf8") > MAX_BUILD_BYTES) {
    throw badRequest("That build is too large to save.");
  }
  if (args.thumbnail && Buffer.byteLength(args.thumbnail, "utf8") > MAX_THUMBNAIL_BYTES) {
    throw badRequest("That build's preview image is too large.");
  }
  // Rendered straight into an <img>, and the content security policy is only on in production.
  if (args.thumbnail && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(args.thumbnail)) {
    throw badRequest("That build's preview is not an image.");
  }
}

// Lists are capped; the counts stay exact.
const MAX_LIST = 100;

const DEMO_IS_READ_ONLY =
  "The demo account's sign-in details cannot be changed, because everyone shares it. Sign up for an account of your own to change these.";

/** The demo account, made on first use. */
async function demoAccount(): Promise<HydratedDocument<UserDocument>> {
  const existing = await User.findOne({ username: DEMO_USERNAME }).exec();
  if (existing) {
    // An account made before this flag existed still needs the protection.
    if (!existing.isDemo) {
      existing.isDemo = true;
      await existing.save();
    }
    return existing;
  }

  try {
    return await User.create({
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      password: randomBytes(24).toString("base64url"),
      isDemo: true,
    });
  } catch (error) {
    // Two visitors can press the button at once; the unique index decides who creates it.
    if (isDuplicateKeyError(error)) {
      const created = await User.findOne({ username: DEMO_USERNAME }).exec();
      if (created) return created;
    }
    throw error;
  }
}

/** Mongo reports a unique-index collision as error code 11000. */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    error !== null && typeof error === "object" && "code" in error && error.code === 11000
  );
}

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

    users: async () => User.find().sort({ createdAt: -1 }).limit(MAX_LIST),

    user: async (_parent: unknown, args: { username: string }) =>
      User.findOne({ username: args.username }),

    thoughts: async (
      _parent: unknown,
      args: { username?: string | null; limit?: number | null; offset?: number | null },
    ) => {
      const { limit, offset } = feedWindow(args);

      if (args.username) {
        const author = await User.findOne({ username: args.username }).select("_id");
        if (!author) return [];
        return Thought.find({ author: author._id })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit);
      }
      return Thought.find().sort({ createdAt: -1 }).skip(offset).limit(limit);
    },

    showcase: async () => {
      const featured = await Build.find({ featured: true }).select("_id");
      const build = featured.length > 0 ? { $in: featured.map((one) => one._id) } : { $ne: null };
      return Thought.find({ build }).sort({ createdAt: -1 }).limit(SHOWCASE_SIZE);
    },

    thought: async (_parent: unknown, args: { _id: string }) =>
      Thought.findById(toObjectId(args._id, "Thought id")),

    build: async (_parent: unknown, args: { _id: string }) =>
      Build.findById(toObjectId(args._id, "Build id")),
  },

  // ---- Field resolvers -------------------------------------------------

  User: {
    followingCount: (parent: UserDocument) => parent.following.length,

    // Followers are everyone whose `following` holds this user. `.exec()` matters,
    // or GraphQL gets a thenable Query and a Query refuses to run twice.
    // isDemo is coerced: accounts from before the field existed have nothing stored.
    isDemo: (parent: UserDocument) => Boolean(parent.isDemo),
    followerCount: async (parent: UserDocument) =>
      User.countDocuments({ following: parent._id }).exec(),

    following: async (parent: UserDocument) =>
      User.find({ _id: { $in: parent.following } }).limit(MAX_LIST).exec(),

    followers: async (parent: UserDocument) =>
      User.find({ following: parent._id }).limit(MAX_LIST).exec(),

    thoughts: async (parent: UserDocument) =>
      Thought.find({ author: parent._id }).sort({ createdAt: -1 }).limit(MAX_LIST),

    builds: async (parent: UserDocument) =>
      Build.find({ owner: parent._id })
        .select("_id name thumbnail createdAt updatedAt")
        .sort({ createdAt: -1 })
        .limit(MAX_LIST),

    // Only the owner sees their email address.
    email: (parent: UserDocument, _args: unknown, context: GraphQLContext) =>
      context.user && context.user._id === parent._id.toString() ? parent.email : null,

    createdAt: (parent: UserDocument) => parent.createdAt.toISOString(),
  },

  // These run once per row, so they go through the request's loaders. The id is
  // stringified because a loader keys its cache by identity, and two ObjectIds
  // for the same user are different objects.
  Thought: {
    author: async (parent: ThoughtDocument, _args: unknown, context: GraphQLContext) =>
      context.loaders.userById.load(String(parent.author)),

    username: async (parent: ThoughtDocument, _args: unknown, context: GraphQLContext) => {
      const author = await context.loaders.userById.load(String(parent.author));
      return author?.username ?? "[deleted]";
    },

    build: async (parent: ThoughtDocument, _args: unknown, context: GraphQLContext) =>
      parent.build ? context.loaders.buildSummaryById.load(String(parent.build)) : null,

    reactionCount: (parent: ThoughtDocument) => parent.reactions.length,

    createdAt: (parent: ThoughtDocument) => parent.createdAt.toISOString(),
  },

  Reaction: {
    author: async (parent: ReactionSubdocument, _args: unknown, context: GraphQLContext) =>
      context.loaders.userById.load(String(parent.author)),

    username: async (parent: ReactionSubdocument, _args: unknown, context: GraphQLContext) => {
      const author = await context.loaders.userById.load(String(parent.author));
      return author?.username ?? "[deleted]";
    },

    parent: (reaction: ReactionSubdocument) =>
      reaction.parent ? String(reaction.parent) : null,

    createdAt: (parent: ReactionSubdocument) => parent.createdAt.toISOString(),
  },

  Build: {
    owner: async (parent: BuildDocument, _args: unknown, context: GraphQLContext) =>
      context.loaders.userById.load(String(parent.owner)),
    createdAt: (parent: BuildDocument) => parent.createdAt.toISOString(),
    updatedAt: (parent: BuildDocument) => parent.updatedAt.toISOString(),
  },

  BuildSummary: {
    createdAt: (parent: BuildDocument) => parent.createdAt.toISOString(),
    updatedAt: (parent: BuildDocument) => parent.updatedAt.toISOString(),
  },

  // ---- Mutations -------------------------------------------------------

  Mutation: {
    addUser: async (
      _parent: unknown,
      args: { username: string; email: string; password: string },
      context: GraphQLContext,
    ) => {
      limitSignup(context.ip);
      // demoAccount() adopts an existing user of this name, so nobody may register it.
      if (args.username.trim().toLowerCase() === DEMO_USERNAME) {
        throw badRequest("That username is reserved.");
      }
      try {
        // Named one by one, so a field added to the mutation later cannot land in the document.
        const user = await User.create({
          username: args.username,
          email: args.email,
          password: args.password,
        });
        return { token: signToken(user), user };
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw badRequest("That username or email address is already taken.");
        }
        const invalid = asUserInputError(error);
        if (invalid) throw invalid;
        throw error;
      }
    },

    login: async (
      _parent: unknown,
      args: { email: string; password: string },
      context: GraphQLContext,
    ) => {
      limitLogin(context.ip);
      const user = await User.findOne({ email: args.email.toLowerCase() });

      // The same message and the same amount of work (see DUMMY_HASH) for an unknown
      // email and a wrong password, so the endpoint cannot reveal which emails exist.
      const failure = badRequest("Incorrect email address or password.");
      if (!user) {
        await bcrypt.compare(args.password, DUMMY_HASH);
        throw failure;
      }
      if (!(await user.isCorrectPassword(args.password))) throw failure;

      return { token: signToken(user), user };
    },
    demoLogin: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      // Without this a script could mint tokens faster than the site resets.
      limitDemo(context.ip);
      const user = await demoAccount();
      return { token: signToken(user), user };
    },

    renewToken: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const auth = requireAuth(context);
      // Read the account back, so a deleted account cannot keep extending its session.
      const user = await User.findById(auth._id);
      if (!user) throw notFound("That account no longer exists.");
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

      await thought.deleteOne();
      return args.thoughtId;
    },

    addReaction: async (
      _parent: unknown,
      args: { thoughtId: string; reactionBody: string; parentId?: string | null },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const thought = await Thought.findById(toObjectId(args.thoughtId, "Thought id"));
      if (!thought) throw notFound("That post no longer exists.");

      let parent: Types.ObjectId | null = null;
      if (args.parentId) {
        const replyingTo = thought.reactions.id(args.parentId);
        if (!replyingTo) throw notFound("That comment no longer exists.");
        // Threads stay one level deep: a reply to a reply joins the same thread.
        parent = replyingTo.parent ?? replyingTo._id;
      }

      thought.reactions.push({
        reactionBody: args.reactionBody,
        author: new Types.ObjectId(auth._id),
        parent,
      } as ReactionSubdocument);
      await thought.save();
      return thought;
    },

    updateReaction: async (
      _parent: unknown,
      args: { thoughtId: string; reactionId: string; reactionBody: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const thought = await Thought.findById(toObjectId(args.thoughtId, "Thought id"));
      if (!thought) throw notFound("That post no longer exists.");

      const reaction = thought.reactions.id(args.reactionId);
      if (!reaction) throw notFound("That comment no longer exists.");
      // Unlike deleting, the post's owner does not get to edit what others wrote.
      if (reaction.author.toString() !== auth._id) {
        throw forbidden("You can only edit your own comments.");
      }

      reaction.reactionBody = args.reactionBody;
      await thought.save();
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

      const isCommentAuthor = reaction.author.toString() === auth._id;
      const isThreadOwner = thought.author.toString() === auth._id;
      if (!isCommentAuthor && !isThreadOwner) {
        throw forbidden("You can only delete your own comments.");
      }

      // A reply whose parent is gone would have nothing to sit under.
      for (const reply of thought.reactions.filter(
        (other) => other.parent?.toString() === reaction._id.toString(),
      )) {
        reply.deleteOne();
      }
      reaction.deleteOne();
      await thought.save();
      return thought;
    },

    updateAccount: async (
      _parent: unknown,
      args: { username?: string | null; email?: string | null },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const user = await User.findById(auth._id);
      if (!user) throw notFound("Your account no longer exists.");
      if (user.isDemo) throw forbidden(DEMO_IS_READ_ONLY);

      if (args.username !== undefined && args.username !== null) user.username = args.username;
      if (args.email !== undefined && args.email !== null) user.email = args.email;

      try {
        await user.save();
      } catch (error) {
        // A duplicate username or email arrives as a key error, not a validation error.
        if (isDuplicateKeyError(error)) {
          throw badRequest("That username or email is already taken.");
        }
        throw asUserInputError(error) ?? error;
      }

      // The name and email live inside the token, so the old one is now wrong.
      return { token: signToken(user), user };
    },

    changePassword: async (
      _parent: unknown,
      args: { currentPassword: string; newPassword: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      const user = await User.findById(auth._id);
      if (!user) throw notFound("Your account no longer exists.");
      if (user.isDemo) throw forbidden(DEMO_IS_READ_ONLY);

      // Stops a stolen token being enough to take an account over permanently.
      if (!(await user.isCorrectPassword(args.currentPassword))) {
        throw badRequest("That is not your current password.");
      }
      if (args.currentPassword === args.newPassword) {
        throw badRequest("Your new password must be different from the old one.");
      }

      // The model hashes on save, so this is assigned in the clear on purpose.
      user.password = args.newPassword;
      try {
        await user.save();
      } catch (error) {
        throw asUserInputError(error) ?? error;
      }

      return { token: signToken(user), user };
    },

    follow: async (_parent: unknown, args: { userId: string }, context: GraphQLContext) => {
      const auth = requireAuth(context);
      const userId = toObjectId(args.userId, "User id");

      if (userId.toString() === auth._id) {
        throw badRequest("You cannot follow yourself.");
      }

      const exists = await User.exists({ _id: userId });
      if (!exists) throw notFound("That user no longer exists.");

      const user = await User.findByIdAndUpdate(
        auth._id,
        { $addToSet: { following: userId } },
        { returnDocument: "after" },
      );
      if (!user) throw notFound("Your account no longer exists.");
      return user;
    },

    unfollow: async (_parent: unknown, args: { userId: string }, context: GraphQLContext) => {
      const auth = requireAuth(context);
      const user = await User.findByIdAndUpdate(
        auth._id,
        { $pull: { following: toObjectId(args.userId, "User id") } },
        { returnDocument: "after" },
      );
      if (!user) throw notFound("Your account no longer exists.");
      return user;
    },

    saveBuild: async (
      _parent: unknown,
      args: BuildPayload,
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      checkBuildPayload(args);

      const owned = await Build.countDocuments({ owner: auth._id });
      if (owned >= MAX_BUILDS_PER_USER) {
        throw badRequest(
          `You already have ${MAX_BUILDS_PER_USER} saved builds. Delete one to save another.`,
        );
      }

      return Build.create({
        owner: new Types.ObjectId(auth._id),
        name: args.name?.trim() || "Untitled build",
        // The client owns the encoding, so it reports its own version.
        format: args.format ?? CURRENT_BUILD_FORMAT,
        data: args.data,
        thumbnail: args.thumbnail ?? undefined,
      });
    },

    // Overwriting is not subject to the cap: it makes no new build.
    updateBuild: async (
      _parent: unknown,
      args: BuildPayload & { buildId: string },
      context: GraphQLContext,
    ) => {
      const auth = requireAuth(context);
      checkBuildPayload(args);

      const build = await Build.findById(toObjectId(args.buildId, "Build id"));
      if (!build) throw notFound("That build no longer exists.");
      if (build.owner.toString() !== auth._id) {
        throw forbidden("You can only overwrite your own builds.");
      }

      if (args.name?.trim()) build.name = args.name.trim();
      build.format = args.format ?? CURRENT_BUILD_FORMAT;
      build.data = args.data;
      build.thumbnail = args.thumbnail ?? undefined;
      return build.save();
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
