process.env["NODE_ENV"] ??= "test";
process.env["MONGODB_URI"] ??= "mongodb://127.0.0.1:27017/chunkd_test";
process.env["JWT_SECRET"] ??= "chunkd-test-signing-key-not-for-real-use-0123456789";
