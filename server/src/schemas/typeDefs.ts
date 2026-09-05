// The GraphQL contract. Compared with the original schema this adds a real Build
// type, the delete/update mutations that only existed as commented-out code, and
// non-null markers (`!`) so the client knows which fields can actually be absent.
export const typeDefs = /* GraphQL */ `
  type User {
    _id: ID!
    username: String!
    "Only returned when you ask about yourself."
    email: String
    friendCount: Int!
    friends: [User!]!
    thoughts: [Thought!]!
    builds: [BuildSummary!]!
    createdAt: String!
  }

  "A build without its world data, cheap enough to list."
  type BuildSummary {
    _id: ID!
    name: String!
    thumbnail: String
    createdAt: String!
  }

  "A build including the encoded world. Fetch one at a time."
  type Build {
    _id: ID!
    name: String!
    format: Int!
    data: String!
    thumbnail: String
    owner: User!
    createdAt: String!
  }

  type Thought {
    _id: ID!
    thoughtText: String!
    author: User!
    "Shortcut for author.username."
    username: String!
    build: BuildSummary
    reactionCount: Int!
    reactions: [Reaction!]!
    "ISO 8601 timestamp. The client decides how to display it."
    createdAt: String!
  }

  type Reaction {
    _id: ID!
    reactionBody: String!
    author: User!
    username: String!
    createdAt: String!
  }

  type Auth {
    token: ID!
    user: User!
  }

  type Query {
    me: User
    users: [User!]!
    user(username: String!): User
    thoughts(username: String): [Thought!]!
    thought(_id: ID!): Thought
    build(_id: ID!): Build
  }

  type Mutation {
    addUser(username: String!, email: String!, password: String!): Auth!
    login(email: String!, password: String!): Auth!

    addThought(thoughtText: String!, buildId: ID): Thought!
    updateThought(thoughtId: ID!, thoughtText: String!): Thought!
    deleteThought(thoughtId: ID!): ID!

    addReaction(thoughtId: ID!, reactionBody: String!): Thought!
    deleteReaction(thoughtId: ID!, reactionId: ID!): Thought!

    addFriend(friendId: ID!): User!
    deleteFriend(friendId: ID!): User!

    saveBuild(name: String, data: String!, thumbnail: String, format: Int): Build!
    deleteBuild(buildId: ID!): ID!
  }
`;
