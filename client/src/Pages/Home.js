
import React from "react";
import { useQuery } from "@apollo/client";
import { QUERY_THOUGHTS, QUERY_ME_BASIC } from "../utils/queries";
import Auth from "../utils/auth";
import FriendList from "../Components/FriendList";
import ThoughtForm from "../Components/ThoughtForm";
import ThoughtList from "../Components/ThoughtList";
// import Footer from '../Components/Footer';

const Home = () => {
	const { loading, data } = useQuery(QUERY_THOUGHTS);

	const { data: userData } = useQuery(QUERY_ME_BASIC);

	const thoughts = data?.thoughts || [];
	console.log(thoughts);

	const loggedIn = Auth.loggedIn();


	//---** RENAME THIS TO FORUM.JS to be the 'FORUM PAGE' **-- //
	return (
		<main>

			<div className='grow justify-center'>

				{loggedIn && (
					// ** FORM FOR NEW POST/THOUGHT on FORUM PAGE** //
					<>
					<div className= 'max-w-screen-lg mx-auto'>
						{/* <p className='text-white text-center text-4xl'>{`Welcome, ${userData.me.username}`}</p> */}
						<div className='container mx-auto'>
							<ThoughtForm />
						</div>
						</div>
						<div className={` mb-3 ${loggedIn && "lg:grid-col-8"}`}>
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
						{/* This changes styling for friend list on Forum Page */}
						{loggedIn && userData ? (
							<div className='max-w-screen-lg mx-auto text-center bg-opacity-40 shadow-xl rounded-lg p-2 my-3'>
								<FriendList
									username={userData.me.username}
									friendCount={userData.me.friendCount}
									friends={userData.me.friends}
								/>
							</div>
						) : null}
					</>
				)}
			</div>
		</main>
	);
};

export default Home;
