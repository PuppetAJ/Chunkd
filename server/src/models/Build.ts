import { Schema, model, type Types, type Model } from "mongoose";

export interface BuildDocument {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  format: number;
  data: string;
  thumbnail?: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
