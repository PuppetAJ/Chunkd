import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { QUERY_THOUGHT, QUERY_ME_BASIC } from '../utils/queries'
import { DELETE_THOUGHT } from '../utils/mutations'
import ReactionList from '../Components/ReactionList'
import ReactionForm from '../Components/ReactionForm'
import Auth from '../utils/auth'

//Import Icons
import { FaRegClock } from 'react-icons/fa';

const SingleThought = props => {

  const [deleteThought] = useMutation(DELETE_THOUGHT)

  const { id: thoughtId } = useParams();

  const { loading, data } = useQuery(QUERY_THOUGHT, {
    variables: { id: thoughtId }
  });

  const userData = useQuery(QUERY_ME_BASIC)

  const thought = data?.thought || {};

  const user = userData.data.me

  if (loading) {
    return <div className="text-gray-300 text-4xl">Loading...</div>;
  }

  const handleClick = async () => {
    console.log('delete button')
    try {
      await deleteThought({
        variables: { thoughtId: thought._id }
      })
      return window.location.replace('/')
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <div className="grow max-w-screen-lg mx-auto bg-opacity-40 items-center justify-center rounded-xl w-full text-gray-300 shadow-xl hover:rounded-2xl">

      <div className= "w-full rounded-lg p-5 my-3">
        <div className="flex items-center justify-between text-xl font-bold p-2 px-3 text-gray-300 bg-gray-700 bg-opacity-40 text-center rounded-lg ">
        <h4 className="duration-300 hover:scale-105 hover:underline">
          <Link   
          to={`/profile/${thought.username}`}>
            {thought.username}
          </Link>{' '}
        </h4>
        <div className='flex items-center text-gray-400 text-xs justify-end'>
									<FaRegClock size={14} /> <p className="pl-3">{thought.createdAt}</p>
										 </div>
                     </div>


        <div className="break-all my-2 p-2 mb-6 shadow-lg rounded-lg">
          <p className="text-ellipsis overflow-hidden">{thought.thoughtText}</p>
        </div>

        <div className="text-grey-400 flex flex-row space-x-1  my-4">
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="text-xs">{thought.createdAt}</p>
        </div>

        {user.username === thought.username && <button onClick={handleClick} className='text-light'>Delete</button>}
        
        <div className="w-full">
          {thought.reactionCount > 0 && <ReactionList reactions={thought.reactions} />}
          {Auth.loggedIn() && <ReactionForm thoughtId={thought._id} />}
         
        </div>
      </div>

    </div>
  )
}

export default SingleThought;








