import React from 'react';
import {Link} from 'react-router-dom';

const FriendList = ({friendCount, username, friends}) => {

    if (!friends || !friends.length) {
        return <p className= 'text-center text-gray-400 text-md rounded-lg p-2 mt-2'>{username}, you haven't added any friends yet.</p>;
    }

    return (
        <div className="container grid grid-cols-4 bg-orange-300">
        <div className="text-gray-400 font-bold">
            <h6 className="text-md"> {friendCount} {friendCount === 1 ? 'friend' : 'friends'} </h6>
        {friends.map(friend => (
            <button className= 'w-100 text-white display-block p-2 hover:underline' key= {friend._id}>
                <Link to={`/profile/${friend.username}`}>{friend.username}</Link>
            </button>
        ))}
        </div>
        </div>
    );
};

export default FriendList;