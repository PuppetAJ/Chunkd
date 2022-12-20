import React from "react";
import { Link } from "react-router-dom";

//Import Icons
import {FaRegClock, FaRegCommentDots }from 'react-icons/fa'

const ThoughtList = ({ thoughts, title }) => {
	if (!thoughts.length) {

		return <h3 className=" btn-minecraft flex flex-col items-center m-auto">No Posts Yet</h3>;

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
							
							<div key={thought._id} className="flex flex-col w-full rounded-xl sm:flex border-b-1 shadow-xl hover:rounded-2xl py- my-3">
								
								<div className="rounded-t flex items-center p-1 px-4 w-auto justify-between bg-gray-700 bg-opacity-40 font-bold">
									<Link
										to={`/profile/${thought.username}`}
										className='font-bold text-gray-300 hover:underline duration-300 hover:scale-105'
									>
										{thought.username}
									</Link>{" "}
									{""}
									<div className='flex text-gray-400 text-xs items-center'>
									<FaRegClock size={14} /> <p className="pl-3">{thought.createdAt}</p>
										 </div>
								</div>

								<div className="break-all">
									<div>
										<p className='shadow-md rounded bg-gray-700 bg-opacity-40 text-ellipsis overflow-hidden text-gray-300 pl-4 p-1 m-2 mb-3'>{thought.thoughtText}</p>
										</div>
										<Link to={`/thought/${thought._id}`}>

											{/* <div className='flex justify-center text-gray-300 hover:scale-110'>
											
											< FaRegCommentDots size={24}/>    
											<p className="pl-2">{thought.reactionCount} </p>
										
										</div> */}

										<button className=" left-1 bottom-1 col-start-4 rounded col-span-3 btn-minecraft break-normal text-xs">
											{thought.reactionCount ? "See" : "Start"} the discussion!<p className="inline-block pl-2">{thought.reactionCount}    </p>< FaRegCommentDots size={16} className="inline-block mb-1 pl-0.5"/></button>
					
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



