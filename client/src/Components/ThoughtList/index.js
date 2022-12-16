import React from "react";
import { Link } from "react-router-dom";

const ThoughtList = ({ thoughts, title }) => {
	if (!thoughts.length) {
		return <h3>No Posts Yet</h3>;
	}

	return (
		<div className="m-auto items-center justify-center w-[680px] rounded-xl group sm:flex space-x-6 bg-white bg-opacity-50 shadow-xl hover:rounded-2xl">
			<div className="sm:w-8/12 pl-0 p-5 justify-center">
				<div className="space-y-2">
				<div className="space-y-4">
					<h3 className="text-md font-bold text-gray-500 text-center">
						{title}
						</h3>
				</div>
				<div className="flex-col items-center p-4 justify-between">
					{thoughts &&
						thoughts.map((thought) => (
							
							<div key={thought._id} className="gap-3 space-y-1">
								
								<p className="flex items-center space-x-4 justify-between">
									<Link
										to={`/profile/${thought.username}`}
										style={{ fontWeight: 700 }}
										className='text-light'
									>
										{thought.username}
									</Link>{" "}
									{""}
									thought on {thought.createdAt}
								</p>

								<div >
									<Link to={`/thought/${thought._id}`}>
										<p>{thought.thoughtText}</p>
										<p className="mb-0 ">
											Reactions: {thought.reactionCount} || Click to{" "}
											{thought.reactionCount ? "see" : "start"} the discussion!
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



