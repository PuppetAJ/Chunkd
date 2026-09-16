import { Schema, model, type Types, type Model } from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export interface UserDocument {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  /** The people this user follows. Followers are the reverse lookup. */
  following: Types.ObjectId[];
  /** True only for the shared demo account, which refuses password and email changes. */
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  isCorrectPassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: [true, "A username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [24, "Username must be at most 24 characters"],
      // Keeps out control characters and look-alike letters from other scripts.
      match: [/^[A-Za-z0-9_.-]+$/, "Username may only use letters, numbers, dots, dashes and underscores"],
    },
    email: {
      type: String,
      required: [true, "An email address is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Must be a valid email address"],
    },
    password: {
      type: String,
      required: [true, "A password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        // Finding someone's followers is a query against this array.
        index: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (this.isNew || this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
});

userSchema.methods.isCorrectPassword = async function (
  this: UserDocument,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User: Model<UserDocument> = model<UserDocument>(
  "User",
  userSchema,
);
