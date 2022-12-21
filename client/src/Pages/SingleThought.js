import React from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { QUERY_THOUGHT, QUERY_ME_BASIC } from '../utils/queries'
import { DELETE_THOUGHT } from '../utils/mutations'
import ReactionList from '../Components/ReactionList'
import ReactionForm from '../Components/ReactionForm'
import Auth from '../utils/auth'

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
    return <div>Loading...</div>;
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
    <div className="grow border-x-2 max-w-screen-lg mx-auto border-gray-800 bg-white items-center justify-center w-[680px] rounded-xl group sm:flex space-x-6 text-gray-300 bg-opacity-50 shadow-xl hover:rounded-2xl">

      <div className="sm:w-8/12 pl-0 p-5">
        <h4 className="text-lg font-bold text-gray-300 bg-gray-700 bg-opacity-40 text-center">
          <span className="text-light">
            {thought.username}
          </span>{' '}
        </h4>


        <div className="text-md my-2 pl-2 p-2">
          <p>{thought.thoughtText}</p>
        </div>


        <div className="text-grey-400 flex flex-row space-x-1  my-4">
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="text-xs">{thought.createdAt}</p>
        </div>

        {user.username === thought.username && <button onClick={handleClick} className='text-light'>Delete</button>}

        <div>
          {thought.reactionCount > 0 && <ReactionList reactions={thought.reactions} />}
          {Auth.loggedIn() && <ReactionForm thoughtId={thought._id} />}
        </div>
      </div>

    </div>
  )
}

export default SingleThought;








