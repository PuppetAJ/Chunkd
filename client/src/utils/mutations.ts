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

// Takes no arguments on purpose. The demo account's password stays on the
// server, so there is nothing here for anyone to read out of the bundle.
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

// Both of these hand back a fresh token: the username and email are baked into
// the old one, so it is wrong the moment either changes.
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

/** Existed only as a commented-out block before the server supported it. */
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
  mutation addReaction($thoughtId: ID!, $reactionBody: String!) {
    addReaction(thoughtId: $thoughtId, reactionBody: $reactionBody) {
      _id
      reactionCount
      reactions {
        _id
        reactionBody
        createdAt
        username
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
      }
    }
  }
`;

/** Replaces ADD_BUILD, which appended a JSON blob to an array on the user. */
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

export const DELETE_BUILD = gql`
  mutation deleteBuild($buildId: ID!) {
    deleteBuild(buildId: $buildId)
  }
`;
