
import React from "react";
import { useQuery } from "@apollo/client";
import { QUERY_THOUGHTS, QUERY_ME_BASIC } from "../utils/queries";
import Auth from "../utils/auth";
import FriendList from "../Components/FriendList";
import ThoughtForm from "../Components/ThoughtForm";
import ThoughtList from "../Components/ThoughtList";

const Home = () => {
	const { loading, data } = useQuery(QUERY_THOUGHTS);

	const { data: userData } = useQuery(QUERY_ME_BASIC);

	const thoughts = data?.thoughts || [];
	console.log(thoughts);

	const loggedIn = Auth.loggedIn();


	//---** RENAME THIS TO FORUM.JS to be the 'FORUM PAGE' **-- //
	return (
		<main id="home">
			<div className='flex-row justify-space-between'>
				{loggedIn && (
					// ** FORM FOR NEW POST/THOUGHT ** //
					<div className='col-12 mb-3'>
						<ThoughtForm />
					</div>
				)}
				<div className={`col-12 mb-3 ${loggedIn && "col-lg-8"}`}>
					{loading ? (
						<div>Loading...</div>
					) : (
						// ** THIS IS THE LIST OF POSTS/BUILDS ** //
						<ThoughtList
							thoughts={thoughts}
							title='Explore Recent Builds'
						/>
					)}
				</div>
				{loggedIn && userData ? (
					<div className='col-12 col-lg-3 mb-3'>
						<FriendList
							username={userData.me.username}
							friendCount={userData.me.friendCount}
							friends={userData.me.friends}
						/>
					</div>
				) : null}
			</div>
		</main>
	);
};

export default Home;
