import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { useQuery, useMutation } from "@apollo/client/react";

import { useAuthStore } from "../lib/auth.ts";
import ThoughtList from "../components/ThoughtList";
import FriendList from "../components/FriendList";
import NewPostDialog from "../components/NewPostDialog/index.tsx";
import { QUERY_USER, QUERY_ME } from "../utils/queries.ts";
import { ADD_FRIEND, DELETE_FRIEND } from "../utils/mutations.ts";

import { AiOutlineUserAdd, AiOutlineUserDelete } from "react-icons/ai";
import { ImPlus } from "react-icons/im";

const Profile = () => {
  const { username: userParam } = useParams();
  const me = useAuthStore((state) => state.user);

  const [modalOn, setModalOn] = useState(false);
  const [friendError, setFriendError] = useState("");

  const viewingOwnProfile = Boolean(userParam) && me?.username === userParam;

  const { loading, data } = useQuery(userParam ? QUERY_USER : QUERY_ME, {
    variables: { username: userParam },
    // Skipped while the redirect below is about to fire.
    skip: viewingOwnProfile,
  });

  const [addFriend] = useMutation(ADD_FRIEND);
  const [deleteFriend] = useMutation(DELETE_FRIEND);

  // Visiting your own username lands you on your own profile page instead of
  // the read-only "someone else" view.
  if (viewingOwnProfile) {
    return <Navigate to="/profile" replace />;
  }

  if (loading) {
    return <div className="ml-6 text-gray-300 text-lg">Loading...</div>;
  }

  const user = data?.me ?? data?.user ?? null;

  if (!user?.username) {
    return (
      <h3 className="btn-minecraft flex flex-col w-1/2 items-center m-auto">
        We couldn&apos;t find that profile.
      </h3>
    );
  }

  // QUERY_ME returns the viewer's own friend list, so this is only meaningful
  // on someone else's profile, which is exactly where the button is shown.
  const alreadyFriends = Boolean(
    userParam && me && user.friends?.some((friend) => friend._id === me._id),
  );

  const handleFriendClick = async () => {
    setFriendError("");
    try {
      if (alreadyFriends) {
        await deleteFriend({ variables: { id: user._id } });
      } else {
        await addFriend({ variables: { id: user._id } });
      }
    } catch (error) {
      setFriendError(error.message ?? "That didn't work. Please try again.");
    }
  };

  return (
    <div className="w-5/6 grow grid grid-cols-3 justify-center mx-auto">
      <div className="col-span-2 text-center rounded-lg p-2 mt-2">
        <h2 className="minecraft mx-auto mb-3 text-white text-3xl p-3">
          {userParam ? `${user.username}'s` : "Welcome to Your"} Profile
        </h2>

        {userParam && (
          <div className="grid mx-auto items-center m-2 text-gray-300">
            <button
              type="button"
              className="minecraft justify-center flex mr-6 items-center duration-300 hover:scale-105"
              onClick={handleFriendClick}
            >
              {alreadyFriends ? (
                <AiOutlineUserDelete size={32} />
              ) : (
                <AiOutlineUserAdd size={32} />
              )}
              <p className="mx-4 text-sm">
                {alreadyFriends ? "Remove friend" : "Add friend"}
              </p>
            </button>
            {friendError && (
              <p className="text-sm text-red-400 mt-2">{friendError}</p>
            )}
          </div>
        )}
      </div>

      <div className="sticky top-[81px] col-span-1 text-center text-lg rounded-lg p-2 mt-2">
        {!userParam && (
          <div className="mx-auto mt-2 shadow-lg">
            <button
              type="button"
              onClick={() => setModalOn(true)}
              className="minecraft text-2xl text-white my-4 flex items-center duration-300 hover:scale-105"
            >
              <ImPlus size={18} />
              <span className="flex ml-3">Add Post</span>
            </button>

            <NewPostDialog open={modalOn} onOpenChange={setModalOn} />
          </div>
        )}

        <div className="bt-2 shadow-lg flex-col">
          <FriendList
            username={user.username}
            friendCount={user.friendCount}
            friends={user.friends}
          />
        </div>
      </div>

      <div className="-mt-10 m-1 col-span-2 justify-center mb-3">
        <div className="mt-3">
          <ThoughtList
            thoughts={user.thoughts}
            title={`${user.username}'s Posts`}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
