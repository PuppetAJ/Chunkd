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


const Profile = () => {

  const [addFriend] = useMutation(ADD_FRIEND)

  const { username: userParam } = useParams();

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam }
  });

  const user = data?.me || data?.user || {};

  if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
    return <Navigate to="/profile:username"/>
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
      <h4>
        You need to be logged in to see this page. Please log in or sign up!
      </h4>
    )
  }

  return (
    <main>
    <div className=" grow items-center border-x-2 max-w-screen-lg mx-auto border-gray-800">
      <div className='text-center text-xl bg-white bg-opacity-50 rounded-lg p-2 my-4'>
        <h2 className='container mx-auto mb-3 bg-dark text-secondary p-3'>
          Viewing {userParam ? `${user.username}'s` : 'your'} profile.
        </h2>
        {userParam && (
          <button className='' onClick={handleClick}>
            Add friend
          </button>
        )}
      </div>

      <div className="flex-row justify-between mb-3">
        <div className="col-12 mb-3 col-lg-8">
          <ThoughtList thoughts={user.thoughts} title={`${user.username}'s thoughts...`} />
        </div>

        <div className="flex-col col-12 col-lg-3 mb-3">
          <FriendList
            username={user.username}
            friendCount={user.friendCount}
            friends={user.friends}
          />
        </div>
        <div className= 'max-w-screen-lg mx-auto'>
      </div>
      <div className='mb-3'>{!userParam && <ThoughtForm />}</div>
    </div>
    </div>
    </main>
  );
};

export default Profile;
