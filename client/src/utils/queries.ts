import { gql } from "@apollo/client";

// Every query here fetches build metadata only; world data is behind QUERY_BUILD.

// Paged. lib/apollo.ts stitches the windows together in the cache.
export const QUERY_SHOWCASE = gql`
  query showcase {
    showcase {
      _id
      thoughtText
      createdAt
      username
      reactionCount
      build {
        _id
        name
        thumbnail
      }
    }
  }
`;

export const QUERY_THOUGHTS = gql`
  query thoughts($username: String, $limit: Int, $offset: Int) {
    thoughts(username: $username, limit: $limit, offset: $offset) {
      _id
      thoughtText
      createdAt
      username
      reactionCount
      build {
        _id
        name
        thumbnail
      }
      reactions {
        _id
        createdAt
        username
        reactionBody
      }
    }
  }
`;

export const QUERY_THOUGHT = gql`
  query thought($id: ID!) {
    thought(_id: $id) {
      _id
      thoughtText
      createdAt
      username
      reactionCount
      build {
        _id
        name
        thumbnail
      }
      reactions {
        _id
        createdAt
        username
        reactionBody
      }
    }
  }
`;

export const QUERY_USER = gql`
  query user($username: String!) {
    user(username: $username) {
      _id
      username
      followerCount
      followingCount
      followers {
        _id
        username
      }
      following {
        _id
        username
      }
      builds {
        _id
        name
        thumbnail
        createdAt
        updatedAt
      }
      thoughts {
        _id
        thoughtText
        createdAt
        reactionCount
      }
    }
  }
`;

export const QUERY_ME = gql`
  query me {
    me {
      _id
      username
      email
      followerCount
      followingCount
      builds {
        _id
        name
        thumbnail
        createdAt
        updatedAt
      }
      thoughts {
        _id
        thoughtText
        createdAt
        reactionCount
        reactions {
          _id
          createdAt
          reactionBody
          username
        }
      }
      followers {
        _id
        username
      }
      following {
        _id
        username
      }
    }
  }
`;

export const QUERY_ME_BASIC = gql`
  query meBasic {
    me {
      _id
      username
      email
      isDemo
      followerCount
      followingCount
      following {
        _id
        username
      }
    }
  }
`;

/** The only query that returns a world's block data. Ask for it on demand. */
export const QUERY_BUILD = gql`
  query build($id: ID!) {
    build(_id: $id) {
      _id
      name
      format
      data
      createdAt
    }
  }
`;

export const QUERY_USERS = gql`
  query users {
    users {
      _id
      username
      followerCount
    }
  }
`;
