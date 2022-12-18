import React from "react";
import { Link } from "react-router-dom";

//Import Icons
import {FaRegClock, FaRegComments }from 'react-icons/fa'

const ThoughtList = ({ thoughts, title }) => {
	if (!thoughts.length) {
		return <h3 className="text-gray-300">No Posts Yet</h3>;
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
							
							<div key={thought._id} className="flex flex-col w-full max-w-screen-lg rounded-xl sm:flex border-b-1 shadow-xl hover:rounded-2xl py- my-3 duration-300 hover:scale-105">
								
								<div className="flex items-center p-1 px-4 w-auto justify-between bg-gray-700 bg-opacity-40 font-bold">
									<Link
										to={`/profile/${thought.username}`}
										className='font-bold text-gray-300 hover:underline hover:scale-110'
									>
										{thought.username}
									</Link>{" "}
									{""}
									<div className='flex text-gray-400 text-xs items-center'>
									<FaRegClock size={14} /> <p className="pl-3">{thought.createdAt}</p>
										 </div>
								</div>

								<div className="break-all">
									
										<p className='text-gray-300 pl-4 p-1 m-2 mb-3' >{thought.thoughtText}</p>
										
										<Link to={`/thought/${thought._id}`}>
										<div className='flex px-2 mb-2 items-center w-full justify-center'>

											<div className='flex text-gray-300 mr-6 items-center hover:scale-110'>
											< FaRegComments size={24}/>    
										<p className="mx-3">{thought.reactionCount} </p>
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



