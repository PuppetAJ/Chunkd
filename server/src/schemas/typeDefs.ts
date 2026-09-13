// The GraphQL contract. Compared with the original schema this adds a real Build
// type, the delete/update mutations that only existed as commented-out code, and
// non-null markers (`!`) so the client knows which fields can actually be absent.
export const typeDefs = /* GraphQL */ `
  type User {
    _id: ID!
    username: String!
    "Only returned when you ask about yourself."
    email: String
    "True for the shared demo account, whose sign-in details are fixed."
    isDemo: Boolean!
    "How many people this user follows."
    followingCount: Int!
    "How many people follow this user."
    followerCount: Int!
    following: [User!]!
    followers: [User!]!
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
    updatedAt: String!
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
    updatedAt: String!
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
    """
    The feed, newest first. Paged: the client asks for a window rather than
    every post ever written, and loads the next window as it scrolls.
    """
    thoughts(username: String, limit: Int, offset: Int): [Thought!]!
    thought(_id: ID!): Thought
    build(_id: ID!): Build
  }

  type Mutation {
    addUser(username: String!, email: String!, password: String!): Auth!
    login(email: String!, password: String!): Auth!

    """
    Sign in as the shared demo account, so the app can be tried without
    creating a real one. The account is created on first use.
    """
    demoLogin: Auth!

    addThought(thoughtText: String!, buildId: ID): Thought!
    updateThought(thoughtId: ID!, thoughtText: String!): Thought!
    deleteThought(thoughtId: ID!): ID!

    addReaction(thoughtId: ID!, reactionBody: String!): Thought!
    deleteReaction(thoughtId: ID!, reactionId: ID!): Thought!

    "Changing a username or email invalidates the old token, so a new one comes back."
    updateAccount(username: String, email: String): Auth!
    changePassword(currentPassword: String!, newPassword: String!): Auth!

    "Following is one-way. There is nothing for the other person to accept."
    follow(userId: ID!): User!
    unfollow(userId: ID!): User!

    saveBuild(name: String, data: String!, thumbnail: String, format: Int): Build!
    "Write a new world and picture into a build the caller owns."
    updateBuild(buildId: ID!, name: String, data: String!, thumbnail: String, format: Int): Build!
    deleteBuild(buildId: ID!): ID!
  }
`;
