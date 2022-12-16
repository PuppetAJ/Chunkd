import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { QUERY_THOUGHT } from '../utils/queries'
import ReactionList from '../Components/ReactionList'
import ReactionForm from '../Components/ReactionForm'
import Auth from '../utils/auth'

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
    <div className="p-4 items-center  justify-center w-[680px] rounded-xl group sm:flex space-x-6 bg-white bg-opacity-50 shadow-xl hover:rounded-2xl">

      <div className="sm:w-8/12 pl-0 p-5">
        <h4 className="text-lg font-bold text-gray-800 text-justify">
          <span className="text-light">
            {thought.username}
          </span>{' '}
          </h4>
       

          <div className="text-md">
          <p>{thought.thoughtText}</p>
        </div>


          <div className="text-grey-400 flex flex-row space-x-1  my-4">
						<svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<p class="text-xs">{thought.createdAt}</p>
					</div>
          
        
          <div>
      {thought.reactionCount > 0 && <ReactionList reactions={thought.reactions}/>}
      {Auth.loggedIn() && <ReactionForm thoughtId={thought._id} />}
      </div>
      </div>
   
    </div>
  )
}

export default SingleThought;








