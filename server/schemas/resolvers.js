// Imports
const { User } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');


// Eventually we want to have worlds be managed by only logged in users
// they will be stored on our DB

// Declare resolvers
const resolvers = {
  // Query resolvers
  Query: {
    me: async (parent, args, context) => {
      // If user is logged in then find the user using the id of the JWT
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
        .select('-__v -password')
        .populate('savedWorlds')
      
        return userData;
      }

      // Otherwise send an authentication error
      throw new AuthenticationError('Not logged in');
    }
  },
  // Mutation resolvers
  Mutation: {
    login: async (parent, { email, password }) => {
      // Login using args
      const user = await User.findOne({ email });

      // If no user data is returned, send an authentication error
      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }

      // Check for correct password
      const correctPw = await user.isCorrectPassword(password);

      // If incorrect password send authentication error
      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      // Sign token and return it
      const token = signToken(user);
      return { token, user };
    },
    addUser: async (parent, args) => {
      // Create user with arguments
      const user = await User.create(args);
      // Create token with user data
      const token = signToken(user);
      // Return data
      return { token, user };
    }
  }
};

// Export resolvers
module.exports = resolvers;