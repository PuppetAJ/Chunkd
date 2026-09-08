/**
 * The shared account behind the "explore with a demo account" button.
 *
 * Kept here rather than inside the resolvers because the seeder needs the same
 * name: on a scheduled reset it clears this account's content but keeps the
 * account itself, so that anyone mid-session keeps a working token.
 */
export const DEMO_USERNAME = "demo";
export const DEMO_EMAIL = "demo@chunkd.test";
