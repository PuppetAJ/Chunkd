import { Schema, model, type Types, type Model } from "mongoose";

// A reaction lives inside its parent thought rather than in its own collection,
// which is how the original app modelled it.
export interface ReactionSubdocument {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  reactionBody: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThoughtDocument {
  _id: Types.ObjectId;
  // The old schema stored the username as a plain string on every thought and
  // reaction. That copy went stale the moment anything changed. Storing the id
  // and reading the name through it keeps one source of truth.
  author: Types.ObjectId;
  thoughtText: string;
  build?: Types.ObjectId;
  reactions: Types.DocumentArray<ReactionSubdocument>;
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<ReactionSubdocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reactionBody: {
      type: String,
      required: [true, "A comment cannot be empty"],
      trim: true,
      minlength: 1,
      maxlength: [280, "A comment must be 280 characters or fewer"],
    },
  },
  { timestamps: true },
);

const thoughtSchema = new Schema<ThoughtDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    thoughtText: {
      type: String,
      required: [true, "A post cannot be empty"],
      trim: true,
      minlength: 1,
      maxlength: [280, "A post must be 280 characters or fewer"],
    },
    // Previously a giant JSON string of the whole world. Now a reference to a
    // row in the builds collection, fetched only when someone opens it.
    build: {
      type: Schema.Types.ObjectId,
      ref: "Build",
    },
    reactions: [reactionSchema],
  },
  { timestamps: true },
);

// The feed is always sorted newest-first, so index that directly.
thoughtSchema.index({ createdAt: -1 });

export const Thought: Model<ThoughtDocument> = model<ThoughtDocument>(
  "Thought",
  thoughtSchema,
);
