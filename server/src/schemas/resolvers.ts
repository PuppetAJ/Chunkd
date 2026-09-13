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

// A save is the seed plus the differences, so a few kilobytes usually, but a
// 3x3 world cleared of vegetation records every removed leaf and reaches about
// 164 KB before a block is placed. A safety net, not a design limit.
const MAX_BUILD_BYTES = 2 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 256 * 1024;

// How many posts one request may ask for. The default is a screenful or two;
// the ceiling stops a client asking for the entire collection in one go.
const DEFAULT_FEED_LIMIT = 10;
const MAX_FEED_LIMIT = 50;

function feedWindow(args: { limit?: number | null; offset?: number | null }) {
  const limit = Math.min(Math.max(args.limit ?? DEFAULT_FEED_LIMIT, 1), MAX_FEED_LIMIT);
  const offset = Math.max(args.offset ?? 0, 0);
  return { limit, offset };
}

// Per-address limits on the three ways to obtain a token. Generous for a
// person, tight for a script. The general limiter in server.ts still applies
// on top.
const limitLogin = attemptLimiter("sign-in", 20, 15 * 60_000);
const limitSignup = attemptLimiter("sign-up", 60, 60 * 60_000);
const limitDemo = attemptLimiter("demo sign-in", 30, 60 * 60_000);

// Compared against when the email is unknown, so both answers cost the same
// and timing the endpoint does not reveal which addresses are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// How many builds one account can hold. A world is a few kilobytes, so this is
// not about disk. It stops one script filling the database between resets.
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
  // The client renders this straight into an <img>. Anything but an inline
  // image is refused here rather than left for the content security policy
  // to catch, since that policy is only on in production.
  if (args.thumbnail && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(args.thumbnail)) {
    throw badRequest("That build's preview is not an image.");
  }
}

// How many of a user's follows, followers, posts or builds one query returns.
// The counts stay exact; only the lists are capped. Along with the depth limit
// this is what bounds how much work one query can ask for.
const MAX_LIST = 100;

// The shared account behind the demo button. It is only ever reached through
// the demoLogin mutation, so nobody types these and the password is thrown away
// as soon as it is hashed.
const DEMO_IS_READ_ONLY =
  "The demo account's sign-in details cannot be changed, because everyone shares it. Sign up for an account of your own to change these.";

/**
 * The demo account, made on first use. HydratedDocument is a user that came back
 * from the database, so it carries .save() and the rest.
 */
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
    // Two visitors can press the button at the same moment and both find it
    // missing. The unique index decides which one creates it, and the other
    // reads back what was just made instead of failing.
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

      // Filtering by username means one extra lookup, because thoughts store the
      // author's id rather than a copy of their name.
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

    thought: async (_parent: unknown, args: { _id: string }) =>
      Thought.findById(toObjectId(args._id, "Thought id")),

    build: async (_parent: unknown, args: { _id: string }) =>
      Build.findById(toObjectId(args._id, "Build id")),
  },

  // ---- Field resolvers -------------------------------------------------
  // These run only when a query actually asks for the field, so listing the
  // feed does not drag down every friend and build of every author.

  User: {
    followingCount: (parent: UserDocument) => parent.following.length,

    // Followers are not stored: they are everyone whose `following` holds this
    // user, which the index on that field is for. `.exec()` matters, or GraphQL
    // gets a thenable Query and a Query refuses to run twice.
    // Coerced rather than read straight through: accounts created before this
    // field existed have no value stored, and the schema promises a boolean.
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
        ? Build.findById(parent.build).select("_id name thumbnail createdAt updatedAt")
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
      // The demo account is created on first use, and demoAccount() adopts an
      // existing user of that name. Without this, whoever registered "demo"
      // first would have had their account quietly turned into the shared
      // public one, password locked and all.
      if (args.username.trim().toLowerCase() === DEMO_USERNAME) {
        throw badRequest("That username is reserved.");
      }
      try {
        // Named one by one rather than passing `args` through. Today the two
        // are the same, but the day a field is added to the mutation for some
        // other reason it must not land in the document by accident.
        const user = await User.create({
          username: args.username,
          email: args.email,
          password: args.password,
        });
        return { token: signToken(user), user };
      } catch (error) {
        // Without this the client saw a raw driver error naming the index.
        if (isDuplicateKeyError(error)) {
          throw badRequest("That username or email address is already taken.");
        }
        // A password that is too short, or a username that is, is the person's
        // to fix. Report it as such rather than as a server fault.
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

      // Deliberately the same message for "no such user" and "wrong password",
      // so the endpoint cannot be used to discover which emails are registered.
      // And the same amount of work: see DUMMY_HASH.
      const failure = badRequest("Incorrect email address or password.");
      if (!user) {
        await bcrypt.compare(args.password, DUMMY_HASH);
        throw failure;
      }
      if (!(await user.isCorrectPassword(args.password))) throw failure;

      return { token: signToken(user), user };
    },
    demoLogin: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      // The tokens are for a shared public account and not worth much, but
      // without this a script could mint them faster than the site resets and
      // use them to post.
      limitDemo(context.ip);
      const user = await demoAccount();
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
        { returnDocument: "after", runValidators: true },
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
        // A duplicate username or email arrives as a Mongo key error rather
        // than a validation error, so it needs saying in plain words.
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

      // Knowing the current password is what stops a stolen token being enough
      // to take an account over permanently.
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

      // $addToSet rather than $push, so following twice is not an error and
      // does not put them in the list twice.
      const user = await User.findByIdAndUpdate(
        auth._id,
        { $addToSet: { following: userId } },
        { returnDocument: "after" },
      );
      if (!user) throw notFound("Your account no longer exists.");
      return user;
    },

    // This existed only as a commented-out block in the original resolvers.
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
        // The encoding lives in the client, so it reports its own version
        // rather than the server keeping a second constant in step.
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
