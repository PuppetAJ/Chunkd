import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { QUERY_THOUGHT } from '../utils/queries'
import ReactionList from '../Components/ReactionList'
import ReactionForm from '../Components/ReactionForm'
import Auth from '../utils/auth'

//Import Icons
import { FaRegClock } from 'react-icons/fa';

const SingleThought = props => {

  const { id: thoughtId } = useParams();

  const { loading, data } = useQuery(QUERY_THOUGHT, {
    variables: { id: thoughtId }
  });

  const thought = data?.thought || {};

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grow max-w-screen-lg mx-auto bg-opacity-40 items-center justify-center rounded-xl w-full text-gray-300 shadow-xl hover:rounded-2xl">

      <div className= "w-full rounded-lg p-5 my-3">
        <div className="flex items-center justify-between text-xl font-bold p-2 px-3 text-gray-300 bg-gray-700 bg-opacity-40 text-center rounded-lg">
        <h4 >
          <span className="text-light hover:underline">
            {thought.username}
          </span>{' '}
        </h4>
        <div className='flex items-center text-gray-400 text-xs justify-end'>
									<FaRegClock size={14} /> <p className="pl-3">{thought.createdAt}</p>
										 </div>
                     </div>


        <div className="break-all my-2 p-2 mb-6 shadow-xl rounded-lg">
          <p>{thought.thoughtText}</p>
        </div>


        

        <div className="w-full">
          {thought.reactionCount > 0 && <ReactionList reactions={thought.reactions} />}
          {Auth.loggedIn() && <ReactionForm thoughtId={thought._id} />}
         
        </div>
      </div>

    </div>
  )
}

export default SingleThought;








