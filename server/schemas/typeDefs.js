// Imports
const { gql } = require('apollo-server-express');

// Initialize type definitions
const typeDefs = gql`
  type User {
    _id: ID
    username: String
    email: String
    savedWorlds: [String]
  }
  
  type Auth {
    token: ID!
    user: User
  }

  type Query {
    me: User
  }

  type Mutation {
    login(email: String!, password: String!): Auth
    addUser(username: String!, email: String!, password: String!): Auth
  }
`;

// Export type definitions
module.exports = typeDefs;