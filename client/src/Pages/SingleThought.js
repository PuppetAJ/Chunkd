import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { QUERY_THOUGHT, QUERY_ME_BASIC, QUERY_ME } from "../utils/queries";
import { DELETE_THOUGHT } from "../utils/mutations";
import ReactionList from "../Components/ReactionList";
import ReactionForm from "../Components/ReactionForm";
import Auth from "../utils/auth";

//Import Icons
import { FaRegClock } from "react-icons/fa";
import SavedBuild from "../Components/SavedBuild";

const SingleThought = (props) => {
  // const [user, setUser] = useState();
  // const [thought, setThought] = useState();
  const [deleteThought] = useMutation(DELETE_THOUGHT);

  const { id: thoughtId } = useParams();

  const { loading, data } = useQuery(QUERY_THOUGHT, {
    variables: { id: thoughtId },
  });

  const thought = data?.thought || {};

  const userData = useQuery(QUERY_ME_BASIC);

  if (loading) {
    return <div className="text-gray-300 text-4xl">Loading...</div>;
  }

  const handleClick = async () => {
    console.log("delete button");
    try {
      await deleteThought({
        variables: { thoughtId: thought._id },
      });
      return window.location.replace("/");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grow max-w-screen-lg mx-auto bg-opacity-40 items-center justify-center rounded-xl w-full text-gray-300 shadow-xl hover:rounded-2xl">
      {thought.build && <SavedBuild data={thought.build} />}
      <div className="w-full rounded-lg p-5 my-3">
	  <div className="flex items-center justify-between text-Lg sm:text-Xl font-bold p-2 px-3 text-gray-300 bg-gray-700 bg-opacity-40 text-center rounded-lg ">
          <h4 className="duration-300 hover:scale-105 hover:underline">
            <Link to={`/profile/${thought.username}`}>{thought.username}</Link>
          </h4>
          <div className='flex flex-col sm:flex-row w-3/4 items-center text-gray-400 text-xs justify-center'>
						<FaRegClock size={14} /> <p className="pl-2 ">{thought.createdAt}</p>
					</div>
        </div>

        <div className="break-all my-2 p-2 mb-6 shadow-lg rounded-lg">
          <p className="text-ellipsis overflow-hidden">{thought.thoughtText}</p>
        </div>

  

        {userData.data && userData.data.me.username === thought.username && (
        <div className="flex flex-col items-center">
		<button onClick={handleClick} className='items-center w-1/8 bg-red-700 rounded-md py-1 px-2 mb-2
		 text-gray-300 duration-300 hover:scale-105 '>
			Delete
		</button>
		</div>
        )}

        <div className="w-full">
          {thought.reactionCount > 0 && (
            <ReactionList reactions={thought.reactions} />
          )}
          {Auth.loggedIn() && <ReactionForm thoughtId={thought._id} />}
        </div>
      </div>
    </div>
  );
};

export default SingleThought;
