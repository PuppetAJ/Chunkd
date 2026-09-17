// Loaded before the tests with --import, so the environment check passes
// without a .env file. The database name keeps test data apart from any
// development database on the same MongoDB; the helper refuses any other.
process.env["NODE_ENV"] ??= "test";
process.env["MONGODB_URI"] ??= "mongodb://127.0.0.1:27017/chunkd_test";
process.env["JWT_SECRET"] ??= "chunkd-test-signing-key-not-for-real-use-0123456789";
