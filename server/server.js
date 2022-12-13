const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { authMiddleware } = require('./utils/auth');
const { typeDefs, resolvers } = require('./schemas');
const path = require('path');
const db = require('./config/connection');

// Initialize Apollo server with type defs, resolvers, and middleware
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: authMiddleware
});

// Initialize express server
const app = express();
const PORT = process.env.PORT || 3001;

// Express middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// if we're in production, serve client/build as static assets
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Catch all route
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/build/index.html'));
// });

// Start apollo server function
const startApolloServer = async () => {
  // waits for server to start before applying middleware
  await server.start();
  server.applyMiddleware({ app });

  // Once db is open open server and log to console
  db.once('open', () => {
    app.listen(PORT, () => {
      console.log(`Use GraphQL at http://localhost:${PORT}${server.graphqlPath}`)
      console.log(`🌍 Now listening on http://localhost:${PORT}`)
    });
  });
}

// start apollo server
startApolloServer();