import React from 'react';
import { Navigate, useParams } from 'react-router-dom'
import Auth from '../utils/auth'
import ThoughtList from '../Components/ThoughtList'
import FriendList from '../Components/FriendList'
import ThoughtForm from '../Components/ThoughtForm'
import { useQuery, useMutation } from '@apollo/client'
import { QUERY_USER, QUERY_ME } from '../utils/queries'
import { ADD_FRIEND } from '../utils/mutations'
// import Footer from '../Components/Footer';

//Import Icons
import {AiOutlineUserAdd} from 'react-icons/ai';


const Profile = () => {

  const [addFriend] = useMutation(ADD_FRIEND)

  const { username: userParam } = useParams();

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam }
  });

  const user = data?.me || data?.user || {};

  if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
    return <Navigate to="/profile"/>
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleClick = async () => {
    try {
      await addFriend({
        variables: { id: user._id }
      })
    } catch (e) {
      console.error(e)
    }
  }

  if (!user?.username) {
    return (
      <h4 className="text-gray-300 text-4XL text-center">
        You need to be logged in to see this page. Please log in or sign up!
      </h4>
    )
  }

  return (
    
    <div className="grid grid-cols-3 justify-center border-x-2 max-w-screen-lg mx-auto border-gray-800">
      <div className='text-center rounded-lg p-2 mt-2'>
        <h2 className='container mx-auto mb-3 text-white text-3xl p-3'>

           {userParam ? `${user.username}'s` : 'Welcome to Your'} Profile

         

        </h2>

       

        {userParam && (

          <div className=" mx-auto items-center m-2 text-gray-300">
          <button className='flex mr-6 items-center duration:300 hover:scale-110' onClick={handleClick}>
           <AiOutlineUserAdd size={32} /> <p className="mx-4 text-sm">Add friend</p>
          </button>

          </div>
        )}
      </div>

      <div className='text-center text-lg bg-opacity-40 shadow-xl rounded-lg p-2 mt-2'>
          <FriendList
            username={user.username}
            friendCount={user.friendCount}
            friends={user.friends}
          />

        </div>

      <div className="col-span-2 justify-center mb-3">
        <div className="mt-3">
          <ThoughtList thoughts={user.thoughts} title={`${user.username}'s Posts`} />
        </div>

        
        <div className= 'max-w-screen-lg mx-auto'>
      </div>
      <div className= 'mb-3'>{!userParam && <ThoughtForm />}</div>
    </div>
    </div>
    
  );
};

export default Profile;



	