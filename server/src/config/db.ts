import mongoose from "mongoose";
import { env } from "./env.ts";

mongoose.set("strictQuery", true);

export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
