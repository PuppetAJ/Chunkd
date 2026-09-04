import mongoose from "mongoose";
import { env } from "./env.ts";

// Reject anything the schema does not declare, instead of silently storing it.
mongoose.set("strictQuery", true);

export async function connectToDatabase(): Promise<void> {
  // The old code passed useNewUrlParser / useUnifiedTopology / useFindAndModify.
  // Modern Mongoose removed all three; passing them now throws.
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
