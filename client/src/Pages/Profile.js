import React from 'react';
import { Navigate, useParams } from 'react-router-dom'
import Auth from '../utils/auth'
import ThoughtList from '../Components/ThoughtList'
import FriendList from '../Components/FriendList'
import ThoughtForm from '../Components/ThoughtForm'
import { useQuery, useMutation } from '@apollo/client'
import { QUERY_USER, QUERY_ME } from '../utils/queries'
import { ADD_FRIEND } from '../utils/mutations'
import Footer from '../Components/Footer';


const Profile = () => {

  const [addFriend] = useMutation(ADD_FRIEND)

  const { username: userParam } = useParams();

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam }
  });

  const user = data?.me || data?.user || {};

  if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
    return <Navigate to='/proile'/>
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
    <div>
      <div className=''>
        <h2 className=''>
          Viewing {userParam ? `${user.username}'s` : 'your'} profile.
        </h2>
        {userParam && (
          <button className='' onClick={handleClick}>
            Add friend
          </button>
        )}
      </div>

      <div className=''>
        <div className=''>
          <ThoughtList thoughts={user.thoughts} title={`${user.username}'s thoughts...`} />
        </div>

        <div className=''>
          <FriendList
            username={user.username}
            friendCount={user.friendCount}
            friends={user.friends}
          />
        </div>
      </div>
    <div className=''>{!userParam && <ThoughtForm/>}</div>
    <Footer/>
    </div>
  );
};

export default Profile;
