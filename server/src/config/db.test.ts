import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import mongoose from "mongoose";
import { IDLE_MS, useDatabase } from "./db.ts";

const { connected, disconnected } = mongoose.ConnectionStates;

after(() => mongoose.disconnect());

test("the connection closes once requests stop, and the next request opens it again", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    await useDatabase();
    assert.equal(mongoose.connection.readyState, connected);

    // A request before the countdown runs out starts it over.
    mock.timers.tick(IDLE_MS - 1);
    await useDatabase();
    mock.timers.tick(IDLE_MS - 1);
    assert.equal(mongoose.connection.readyState, connected);

    mock.timers.tick(1);
    await new Promise<void>((resolve) => mongoose.connection.once("disconnected", () => resolve()));
    assert.equal(mongoose.connection.readyState, disconnected);

    await useDatabase();
    assert.equal(mongoose.connection.readyState, connected);
  } finally {
    mock.timers.reset();
  }
});
