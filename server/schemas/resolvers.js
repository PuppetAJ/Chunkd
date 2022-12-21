const { AuthenticationError } = require("apollo-server-express");
const { User, Thought } = require("../models");
const { signToken } = require("../utils/auth");

// Resolvers
const resolvers = {

	Query: {
		thoughts: async (parent, { username }) => {
			const params = username ? { username } : {};
			return Thought.find(params).sort({ createdAt: -1 });
		},

		thought: async (parent, { _id }) => {
			return Thought.findOne({ _id });
		},

		users: async () => {
			return User.find()
				.select("-__v -password")
				.populate("friends")
				.populate("thoughts");
		},

		user: async (parent, { username }) => {
			return User.findOne({ username })
				.select("-__v -password")
				.populate("friends")
				.populate("thoughts");
		},

		me: async (parent, args, context) => {
			if (context.user) {
				const userData = await User.findOne({ _id: context.user._id })
					.select("-__v -password")
					.populate("thoughts")
					.populate("friends");

				return userData;
			}

			throw new AuthenticationError("Not logged in");
		},
	},

	Mutation: {
		addUser: async (parent, args) => {
			const user = await User.create(args);
			const token = signToken(user);

			return { token, user };
		},

		login: async (parent, { email, password }) => {
			const user = await User.findOne({ email });

			if (!user) {
				throw new AuthenticationError("Incorrect credentials");
			}

			const correctPw = await user.isCorrectPassword(password);

			if (!correctPw) {
				throw new AuthenticationError("Incorrect credentials");
			}

			const token = signToken(user);
			console.log("Login successful");
			return { token, user };
		},

		addThought: async (parent, args, context) => {
			if (context.user) {
				const thought = await Thought.create({
					...args,
					username: context.user.username,
				});

				await User.findByIdAndUpdate(
					{ _id: context.user._id },
					{ $push: { thoughts: thought._id } },
					{ new: true },
				);

				return thought;
			}

			throw new AuthenticationError("You need to be loggen in");
		},

		deleteThought: async (parent, { thoughtId }, context) => {
			if (context.user) {
				try {
					const thought = await Thought.findById(thoughtId)

					if (context.user.username === thought.username) {
						await thought.delete()
						console.log('Post deleted successfully')
						return
					} else {
						throw new AuthenticationError('Action denied, you are not the owner')
					}
				} catch (err) {
					throw new Error(err)
				}
			}

			throw new AuthenticationError('You need to be loggen in')
		},

		addReaction: async (parent, { thoughtId, reactionBody }, context) => {
			if (context.user) {
				const updatedThought = await Thought.findOneAndUpdate(
					{ _id: thoughtId },
					{
						$push: {
							reactions: { reactionBody, username: context.user.username },
						},
					},
					{ new: true, runValidators: true },
				);

				return updatedThought;
			}

			throw new AuthenticationError("You need to be logged in");
		},

		addFriend: async (parent, { friendId }, context) => {
			if (context.user) {
				const updatedUser = await User.findOneAndUpdate(
					{ _id: context.user._id },
					{ $addToSet: { friends: friendId } },
					{ new: true },
				).populate("friends");

				return updatedUser;
			}

			throw new AuthenticationError("You meed to be logged in");
		},

		// deleteFriend: async (parent, { friendId }, context) => {
		// 	if (context.user) {
		// 		const user = await User.findOneAndUpdate(
		// 			{ _id: context.user._id },
		// 			{ $pull: {friends: {$in: [friendId]}} },
		// 			{new: true}
		// 		)

		// 		return user;
		// 	}
		// }
	},
};

module.exports = resolvers;

