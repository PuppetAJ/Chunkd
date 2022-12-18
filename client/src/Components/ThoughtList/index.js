import React from "react";
import { Link } from "react-router-dom";

//Import Icons
import {FaRegClock, FaRegComments }from 'react-icons/fa'

const ThoughtList = ({ thoughts, title }) => {
	if (!thoughts.length) {
		return <h3>No Posts Yet</h3>;
	}

	return (
		 <div className="mx-auto items-center justify-center max-w-screen-lg rounded-xl sm:flex  shadow-xl hover:rounded-2xl">
			
			<div className="sm:w-8/12 justify-center">
				<div className="space-y-2">
				<div className="space-y-4 bg-gray-700 bg-opacity-40 shadow-xl rounded-lg">
					<h3 className="text-xl p-3 font-bold text-center text-white">
						{title}
						</h3>
				</div>
				<div className="flex-col items-center py-4 justify-between">
					{thoughts &&
						thoughts.map((thought) => (
							
							<div key={thought._id} className="flex flex-col w-full max-w-screen-lg rounded-xl sm:flex  bg-gray-700 bg-opacity-50 shadow-xl hover:rounded-2xl py- my-3 duration-300 hover:scale-105">
								
								<div className="flex items-center p-1 w-auto justify-evenly bg-gray-500 font-bold">
									<Link
										to={`/profile/${thought.username}`}
										className='font-bold text-gray-400 hover:underline hover:scale-110'
									>
										{thought.username}
									</Link>{" "}
									{""}
									<div className='flex text-gray-400 items-center'>
									<FaRegClock size={14} /> <p className="pl-3">{thought.createdAt}</p>
										 </div>
								</div>

								<div >
									
										<p className='text-gray-400 p-1 m-2 mb-3'>{thought.thoughtText}</p>
										
										<Link to={`/thought/${thought._id}`}>
										<div className='flex px-2 mb-2 items-center w-full justify-center'>

											<div className='flex text-gray-400 mr-6 items-center hover:scale-110'>
											< FaRegComments size={24}/>    
										<p className="mx-4">{thought.reactionCount} </p>
										</div>

										<button className="btn-minecraft text-xs">Click to {" "}
											{thought.reactionCount ? "see" : "start"} the discussion! </button>
											</div>
					
									</Link>
								</div>
							</div>
						))}
					</div>	
				</div>
			</div>
		 </div>
	);
};

export default ThoughtList;