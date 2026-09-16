import { Schema, model, type Types, type Model } from "mongoose";

export interface BuildDocument {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  // Version of the encoding used by `data`, so old builds stay readable.
  format: number;
  // The world itself, in the compact encoded form.
  data: string;
  // A small JPEG data URL rendered at save time, so galleries need no WebGL.
  thumbnail?: string;
  // Set by the seeder on the showcase builds, which the landing page shows ahead of newer posts.
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Fallback for a save that does not say which encoding it wrote. Keep in step with the client. */
export const CURRENT_BUILD_FORMAT = 3;

const buildSchema = new Schema<BuildDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [60, "A build name must be 60 characters or fewer"],
      default: "Untitled build",
    },
    format: {
      type: Number,
      required: true,
      default: CURRENT_BUILD_FORMAT,
    },
    data: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

buildSchema.index({ owner: 1, createdAt: -1 });

export const Build: Model<BuildDocument> = model<BuildDocument>(
  "Build",
  buildSchema,
);
