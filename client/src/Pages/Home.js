
import { React, useState } from "react";
import { useQuery } from "@apollo/client";
import { QUERY_THOUGHTS, QUERY_ME_BASIC } from "../utils/queries";
import Auth from "../utils/auth";
import FriendList from "../Components/FriendList";
// import ThoughtForm from "../Components/ThoughtForm";
import ThoughtList from "../Components/ThoughtList";
import PostModal from "../Components/PostModal";

//Import Icons
import {ImPlus} from 'react-icons/im';

const Home = () => {
	const { loading, data } = useQuery(QUERY_THOUGHTS);

	const { data: userData } = useQuery(QUERY_ME_BASIC);

	const thoughts = data?.thoughts || [];
	console.log(thoughts);

	const loggedIn = Auth.loggedIn();

	//Logic for Modal
	const [modalOn, setModalOn] = useState(false);
	const [choice, setChoice] = useState(false)

	const clicked = () => {
		setModalOn(true)
	}



	//---** RENAME THIS TO FORUM.JS to be the 'FORUM PAGE' **-- //
	return (
		<main>

			<div className=' grid grid-cols-3 grow w-5/6 justify-center mx-auto'>

				{loggedIn && (
					// ** FORM FOR NEW POST/THOUGHT on FORUM PAGE** //
					<>
						<div className='col-start-3 mx-auto top-[81px]'>
							{/* <p className='text-white text-center text-4xl'>{`Welcome, ${userData.me.username}`}</p> */}
							<div className='container mx-auto'>

								{/* Logic for Modal Here */}

								{/* button for modal click  */}
								<button onClick={clicked} className="minecraft text-2xl text-white my-4 flex items-center duration-300 hover:scale105"><ImPlus size={18} /><span className="flex ml-3">Add Post</span></button>

								{/* MODAL LOGIC to conditionally render modal choice */}
								{choice}
								{/* <PostModal /> */}
								{modalOn && < PostModal setModalOn={setModalOn} setChoice={setChoice} />}


							</div>
						</div>
						<div className={`-mt-8 mb-3 gap-x-2 ${loggedIn && "col-start-1 col-span-2"}`}>
							{loading ? (
								<div className="text-gray-300 text-lg">Loading...</div>
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
							<div className='flex-col w-full mx-auto text-center bg-opacity-40 shadow-lg rounded-lg p-2 my-3'>
								<FriendList
									username={userData.me.username}
									friendCount={userData.me.friendCount}
									friends={userData.me.friends}
								/>
							</div>
						) : null}
					</>
				)}

				{!loggedIn && (
					<>
					<div className="nologin bg-cover">
					</div>
					</>
				)}
			</div>
		</main>
	);
};

export default Home;


