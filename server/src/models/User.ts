import { Schema, model, type Types, type Model } from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// The shape of a user document. Writing this out by hand means the editor can
// autocomplete `user.username` and will complain about `user.usrname`.
export interface UserDocument {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  /**
   * The people this user follows.
   *
   * This has always been a one-way list. Adding someone put them here and
   * nowhere else, so it was a following list wearing the word "friends". The
   * name now says what it is. Followers are the reverse lookup: everyone whose
   * `following` contains this user.
   */
  following: Types.ObjectId[];
  /**
   * True only for the shared account behind the "explore the demo" button.
   *
   * It exists so that account can be refused the changes that would lock
   * everyone else out of it, such as a new password or a new email address.
   */
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
      // Raised from 5. Short passwords were the weakest part of the old auth.
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
        // Indexed because finding someone's followers means asking which users
        // have their id in this array, which is a query against it.
        index: true,
      },
    ],
  },
  {
    // Replaces the hand-rolled createdAt field and its date-formatting getter.
    timestamps: true,
  },
);

// Hash the password before it is written, whether the user is new or changing it.
// An async hook reports that it is finished by returning, so unlike the old
// callback style there is no `next` to call.
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
