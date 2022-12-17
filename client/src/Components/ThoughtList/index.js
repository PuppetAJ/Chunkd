import React from "react";
import { Link } from "react-router-dom";

//Import Icons
import {FaRegClock, FaRegComments }from 'react-icons/fa'

const ThoughtList = ({ thoughts, title }) => {
	if (!thoughts.length) {
		return <h3>No Posts Yet</h3>;
	}

	return (
		 <div className="mx-auto items-center justify-center max-w-screen-lg rounded-xl group sm:flex space-x-6 bg-white bg-opacity-50 shadow-xl hover:rounded-2xl">
			<div className="sm:w-8/12 pl-0 p-5 justify-center">
				<div className="space-y-2">
				<div className="space-y-4 bg-gray-500">
					<h3 className="text-md font-bold text-gray-600 text-center text-white">
						{title}
						</h3>
				</div>
				<div className="flex-col items-center p-4 justify-between">
					{thoughts &&
						thoughts.map((thought) => (
							
							<div key={thought._id} className="gap-3 space-y-1">
								
								<p className="flex items-center p-2 space-x-5 justify-between bg-gray-500 font-bold">
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
									<Link to={`/thought/${thought._id}`}>
										<p>{thought.thoughtText}</p>
										<p className="mb-0 ">
										<div className='flex-row inline-flex p-2'><span className='flex items-center text-right'>< FaRegComments size={18} /> {thought.reactionCount}</span> || <button className="btn-minecraft text-xs">Click to {" "}
											{thought.reactionCount ? "see" : "start"} the discussion! </button></div>
										</p>
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



