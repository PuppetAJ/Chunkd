import { React, useState } from "react";
import { Navigate, useParams } from 'react-router-dom'
import Auth from '../utils/auth'
import ThoughtList from '../Components/ThoughtList'
import FriendList from '../Components/FriendList'
import { useQuery, useMutation } from '@apollo/client'
import { QUERY_USER, QUERY_ME } from '../utils/queries'
import { ADD_FRIEND, DELETE_FRIEND } from '../utils/mutations'
import PostModal from "../Components/PostModal";
// import Footer from '../Components/Footer';

//Import Icons
import { AiOutlineUserAdd } from 'react-icons/ai';
import { ImPlus } from 'react-icons/im';



const Profile = () => {

  const [addFriend] = useMutation(ADD_FRIEND)

  const { username: userParam } = useParams();

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam }
  });

  const user = data?.me || data?.user || {};

  // const [deleteFriend] = useMutation(DELETE_FRIEND)

  console.log(user.thoughts);

  const [modalOn, setModalOn] = useState(false);
  const [choice, setChoice] = useState(false)

  const clicked = () => {
    setModalOn(true)
  }

  if (Auth.loggedIn() && Auth.getProfile().data.username === userParam) {
    return <Navigate to="/profile" />
  }

  if (loading) {
    return <div className="ml-6 text-gray-300 text-lg">Loading...</div>;
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
      <h3 className="btn-minecraft flex flex-col w-1/2 items-center m-auto animate-pulse">
        You need to be logged in to see this page. Please log in or sign up!
      </h3>
    )
  }

  // // Get current logged in user data
  // const getMe = Auth.getProfile()
  // const meUsername = getMe.data.username
  // const meId = getMe.data._id

  // console.log(userParam)
  // console.log(meUsername)
  // console.log(meId)
  // console.log(getMe)

  return (
    <div className="w-5/6 grow grid grid-cols-3 justify-center  mx-auto">
      <div className='col-span-2 text-center rounded-lg p-2 mt-2'>
        <h2 className='minecraft container mx-auto mb-3 text-white text-3xl p-3'>

          {userParam ? `${user.username}'s` : 'Welcome to Your'} Profile



        </h2>

        {userParam && (

          <div className="grid mx-auto items-center m-2 text-gray-300">
            <button className='minecraft justify-center flex mr-6 items-center duration:300 hover:scale-105' onClick={handleClick}>
              <AiOutlineUserAdd size={32} /> <p className="mx-4 text-sm">Add friend</p>
            </button>
          </div>

          
          )}
          
        </div>
      <div className='sticky top-[81px] col-span-1 text-center text-lg bg-opacity-40 rounded-lg p-2 mt-2'>
        {!userParam && (
        <div className='container mx-auto mt-2 shadow-lg'>

          {/* Logic for Modal Here */}

          {/* button for modal click  */}
          <button onClick={clicked} className="minecraft text-2xl text-white my-4 flex items-center duration-300 hover:scale-105"><ImPlus size={18} /><span className="flex ml-3">Add Post</span></button>

          {/* MODAL LOGIC to conditionally render modal choice */}
         
          {modalOn && < PostModal setModalOn={setModalOn} setChoice={setChoice} />}


        </div>
     )}


        <div className='bt-2 shadow-lg flex-col'>
          <FriendList
            username={user.username}
            friendCount={user.friendCount}
            friends={user.friends}
          />
        </div>
      </div>

      <div className="-mt-10 m-1 col-span-2 justify-center mb-3">
        <div className="mt-3">
          <ThoughtList thoughts={user.thoughts} title={`${user.username}'s Posts`} />
        </div>


        <div className='max-w-screen-lg mx-auto'>
        </div>
      </div>
    </div>
  );
};

export default Profile;



