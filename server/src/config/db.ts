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

// Railway sleeps the app only after ten minutes without outbound traffic, and
// the driver checks on Mongo every ten seconds, so an open connection keeps the
// app awake and billed around the clock. The server opens it per request
// instead, and closes it once requests stop.
export const IDLE_MS = 5 * 60_000;

let idleTimer: NodeJS.Timeout | undefined;
let lastConnectionChange: Promise<unknown> = Promise.resolve();
const queueConnectionChange = <T>(step: () => Promise<T>): Promise<T> => {
  const next = lastConnectionChange.then(step, step);
  lastConnectionChange = next.catch(() => {});
  return next;
};

export async function useDatabase(): Promise<void> {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    void queueConnectionChange(async () => {
      await disconnectFromDatabase();
      console.log("Closed the idle MongoDB connection");
    });
  }, IDLE_MS).unref();
  if (isOpen()) return;
  await queueConnectionChange(async () => {
    if (!isOpen()) await connectToDatabase();
  });
}

const isOpen = () => mongoose.connection.readyState === mongoose.ConnectionStates.connected;
