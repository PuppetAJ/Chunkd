import { Schema, model, type Types, type Model } from "mongoose";

// A saved voxel world.
//
// The old app kept these as raw JSON strings inside an untyped array on the user
// document, so every profile or editor page load dragged down every build the
// user had ever saved. That is why the API had to accept 50 MB request bodies.
// Builds now live in their own collection and are fetched one at a time.
export interface BuildDocument {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  // Version of the encoding used by `data`, so old builds stay readable after
  // the format changes.
  format: number;
  // The world itself, in the compact encoded form.
  data: string;
  // A small JPEG data URL rendered at save time, so galleries can show a build
  // without starting a WebGL context for each one.
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Used only when a client does not say which encoding it wrote. */
export const CURRENT_BUILD_FORMAT = 2;

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
  },
  { timestamps: true },
);

buildSchema.index({ owner: 1, createdAt: -1 });

export const Build: Model<BuildDocument> = model<BuildDocument>(
  "Build",
  buildSchema,
);
