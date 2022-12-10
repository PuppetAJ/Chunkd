// Imports
const mongoose = require('mongoose');

// Connect to DB using either MONGODB_URI or local host url
mongoose.set('debug', true);
mongoose.set('strictQuery', true);

// Settings removed due to updated mongoose
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/reactmc', {});

// Export connection
module.exports = mongoose.connection;
