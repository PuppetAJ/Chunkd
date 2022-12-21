import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import { ADD_THOUGHT } from "../../utils/mutations";
import { QUERY_THOUGHTS, QUERY_ME, QUERY_USER } from "../../utils/queries";
import { useQuery } from "@apollo/client";
import { Navigate, useParams } from "react-router-dom";
import Auth from "../../utils/auth";
//Import Icons
import { ImPlus } from "react-icons/im";

const PostModal = ({ setModalOn, setChoice }) => {
	const { username: userParam } = useParams();

	const [selected, setSelected] = useState(0);
	const [thoughtText, setText] = useState("");
	const [characterCount, setCharacterCount] = useState(0);

	//Declare addthought function and error variable
	const [addThought, { error }] = useMutation(ADD_THOUGHT, {
		update(cache, { data: { addThought } }) {
			//read what's currently in the cache
			//Could potentially not exist yet so wrap in try/catch
			try {
				//update Me array's cache
				const { me } = cache.readQuery({ query: QUERY_ME });
				cache.writeQuery({
					query: QUERY_ME,
					data: { me: { ...me, thoughts: [...me.thoughts, addThought] } },
				});
			} catch (e) {
				console.warn("First thought insertion by user!");
			}

			//update thought array's cache
			const { thoughts } = cache.readQuery({ query: QUERY_THOUGHTS });

			//prepend the newest thought to the front of the array
			cache.writeQuery({
				query: QUERY_THOUGHTS,
				data: { thoughts: [addThought, ...thoughts] },
			});
		},
	});

	const handleChange = (event) => {
		if (event.target.value.length <= 280) {
			setText(event.target.value);
			setCharacterCount(event.target.value.length);
		}
	};

	//Function to handle Modal click to add Post
	const handleOKClick = async (event) => {
		event.preventDefault();

		try {
			//add thought to database
			await addThought({
				variables: { thoughtText },
			});

			//clear form value
			setText("");
			setCharacterCount(0);
		} catch (e) {
			console.error(e);
		}

		setChoice(true);
		setModalOn(false);
	};

	const handleCancelClick = () => {
		setChoice(false);
		setModalOn(false);
	};

	const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
		variables: { username: userParam },
	});

	const user = data?.me || data?.user || {};

	if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
		return <Navigate to="/test" />;
	}

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!user?.username) {
		return (
			<h3 className="btn-minecraft flex flex-col items-center m-auto animate-pulse">
				You need to be logged in to see this page. Please log in or sign up!
			</h3>
		);
	}
	// function handleChange(e) {
	// 	setSelected(+e.target.value);
	// 	console.log(typeof selected);
	// 	// console.log(selected);
	// 	//console.log(e.target.value);
	// }

	// Return JSX for Post Modal
	return (
		<div className="  bg-zinc-800 bg-opacity-80 fixed inset-0 z-100">
			<div className="flex h-screen justify-center items-center mx-auto w-1/2 sm:w-full  ">
				<div className="flex-col justify-center bg-zinc-900 py-12 px-16 border-2 border-gray-300 rounded-xl sm:w-1/2 ">
	<p
							html4="textarea"
							className="minecraft text-3xl text-white mb-8 flex items-center border-b-2"
						>
							<ImPlus size={18}/>
							<span className="flex ml-3">Add Post</span>
						</p>

					<form className='flex flex-col items-center p-2'>
						<select className="bg-gray-700 text-gray-300 mb-3" onChange={handleChange} id="dropdown">
							{user.savedBuilds.map((el, i) => (
								<option key={i} value={i}>{`Build ${i + 1}`}</option>
							))}
						</select>

		

						<p
							className={`text-xs text-gray-400 mb-1  ${characterCount === 280 || error ? "text-error" : ""
								}`}
						>
							Character Count: {characterCount}/280
							{error && <span className="ml-2">Something went wrong...</span>}
						</p>
						<textarea
							placeholder="Share something new!"
							value={thoughtText}
							name="textarea"
							className=' block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
							rows='4'
							onChange={handleChange}
						>
							{" "}
						</textarea>
					</form>

					{/* Fix Responsiveness */}
					<div className="flex flex-col items-center sm:flex-row sm:justify-evenly px-2">
						<button
							onClick={handleOKClick}
							className='btn-minecraft mt-2 duration-300 hover:scale-105 text-xs md:text-sm'
							type="submit"
						>
							Post
						</button>
						<button
							onClick={handleCancelClick}
							className='btn-minecraft mt-2 duration-300 hover:scale-105 text-xs md:text-sm'
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PostModal;
