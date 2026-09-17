import { gql } from "@apollo/client";

export const LOGIN_USER = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        _id
        username
      }
    }
  }
`;

// Takes no arguments on purpose: the demo password stays on the server.
export const DEMO_LOGIN = gql`
  mutation demoLogin {
    demoLogin {
      token
      user {
        _id
        username
      }
    }
  }
`;

export const ADD_USER = gql`
  mutation addUser($username: String!, $email: String!, $password: String!) {
    addUser(username: $username, email: $email, password: $password) {
      token
      user {
        _id
        username
      }
    }
  }
`;

// Both hand back a fresh token, since the username and email are baked into the old one.
export const UPDATE_ACCOUNT = gql`
  mutation updateAccount($username: String, $email: String) {
    updateAccount(username: $username, email: $email) {
      token
      user {
        _id
        username
        email
      }
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation changePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      token
      user {
        _id
        username
      }
    }
  }
`;

export const FOLLOW = gql`
  mutation follow($id: ID!) {
    follow(userId: $id) {
      _id
      username
      followingCount
      following {
        _id
        username
      }
    }
  }
`;

export const UNFOLLOW = gql`
  mutation unfollow($id: ID!) {
    unfollow(userId: $id) {
      _id
      username
      followingCount
      following {
        _id
        username
      }
    }
  }
`;

export const ADD_THOUGHT = gql`
  mutation addThought($thoughtText: String!, $buildId: ID) {
    addThought(thoughtText: $thoughtText, buildId: $buildId) {
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
      }
    }
  }
`;

export const UPDATE_THOUGHT = gql`
  mutation updateThought($thoughtId: ID!, $thoughtText: String!) {
    updateThought(thoughtId: $thoughtId, thoughtText: $thoughtText) {
      _id
      thoughtText
      createdAt
    }
  }
`;

export const DELETE_THOUGHT = gql`
  mutation deleteThought($thoughtId: ID!) {
    deleteThought(thoughtId: $thoughtId)
  }
`;

export const ADD_REACTION = gql`
  mutation addReaction($thoughtId: ID!, $reactionBody: String!, $parentId: ID) {
    addReaction(thoughtId: $thoughtId, reactionBody: $reactionBody, parentId: $parentId) {
      _id
      reactionCount
      reactions {
        _id
        reactionBody
        createdAt
        username
        parent
      }
    }
  }
`;

export const UPDATE_REACTION = gql`
  mutation updateReaction($thoughtId: ID!, $reactionId: ID!, $reactionBody: String!) {
    updateReaction(thoughtId: $thoughtId, reactionId: $reactionId, reactionBody: $reactionBody) {
      _id
      reactionCount
      reactions {
        _id
        reactionBody
        createdAt
        username
        parent
      }
    }
  }
`;

export const DELETE_REACTION = gql`
  mutation deleteReaction($thoughtId: ID!, $reactionId: ID!) {
    deleteReaction(thoughtId: $thoughtId, reactionId: $reactionId) {
      _id
      reactionCount
      reactions {
        _id
        reactionBody
        createdAt
        username
        parent
      }
    }
  }
`;

export const RENEW_TOKEN = gql`
  mutation renewToken {
    renewToken {
      token
      user {
        _id
        username
      }
    }
  }
`;

export const SAVE_BUILD = gql`
  mutation saveBuild($name: String, $data: String!, $thumbnail: String, $format: Int) {
    saveBuild(name: $name, data: $data, thumbnail: $thumbnail, format: $format) {
      _id
      name
      thumbnail
      createdAt
    }
  }
`;

export const UPDATE_BUILD = gql`
  mutation updateBuild($buildId: ID!, $name: String, $data: String!, $thumbnail: String, $format: Int) {
    updateBuild(buildId: $buildId, name: $name, data: $data, thumbnail: $thumbnail, format: $format) {
      _id
      name
      thumbnail
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_BUILD = gql`
  mutation deleteBuild($buildId: ID!) {
    deleteBuild(buildId: $buildId)
  }
`;
