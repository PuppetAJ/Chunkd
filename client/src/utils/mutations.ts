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

export const ADD_FRIEND = gql`
  mutation addFriend($id: ID!) {
    addFriend(friendId: $id) {
      _id
      username
      friendCount
      friends {
        _id
        username
      }
    }
  }
`;

/** Existed only as a commented-out block before the server supported it. */
export const DELETE_FRIEND = gql`
  mutation deleteFriend($id: ID!) {
    deleteFriend(friendId: $id) {
      _id
      username
      friendCount
      friends {
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
