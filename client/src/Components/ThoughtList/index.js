import React from "react";
import { Link } from "react-router-dom";

//Import Icons
import {FaRegClock, FaRegComments }from 'react-icons/fa'

const ThoughtList = ({ thoughts, title }) => {
	if (!thoughts.length) {
		return <h3>No Posts Yet</h3>;
	}

	return (
		 <div className="mx-auto items-center justify-center max-w-screen-lg rounded-xl group sm:flex  bg-white bg-opacity-50 shadow-xl hover:rounded-2xl">
			<div className="sm:w-8/12 p-5 justify-center">
				<div className="space-y-2">
				<div className="space-y-4 bg-gray-500">
					<h3 className="text-xl p-3 font-bold text-center text-white">
						{title}
						</h3>
				</div>
				<div className="flex-col items-center py-4 justify-between">
					{thoughts &&
						thoughts.map((thought) => (
							
							<div key={thought._id} className="gap-3 space-y-1 w-auto">
								
								<p className="flex items-center p-1 mx-auto justify-between bg-gray-500 font-bold">
									<Link
										to={`/profile/${thought.username}`}
										style={{ fontWeight: 700 }}
										className='text-light'
									>
										{thought.username}
									</Link>{" "}
									{""}
									<span className="text-xs text-white justify-between" >
									<FaRegClock size={14} /> {thought.createdAt}
										 </span>
								</p>

								<div >
									
										<p>{thought.thoughtText}</p>
										
										<Link to={`/thought/${thought._id}`}>
										<div className='flex px-2 mb-2 items-center mx-auto justify-center'>< FaRegComments size={18} />    
										
										{thought.reactionCount} <button className="btn-minecraft">Click to {" "}
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



