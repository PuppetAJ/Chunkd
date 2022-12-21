import React from 'react';
import {Link} from 'react-router-dom';

const FriendList = ({friendCount, username, friends}) => {

    if (!friends || !friends.length) {
        return <p className= 'text-center break-normal mx-auto text-gray-400 text-sm rounded-lg p-2 mt-2'>{username} hasn't added any friends yet!</p>;
    }

    return (
        <div className="container mt-2 rounded grid grid-cols-4 bg-gray-700 bg-opacity-40">
        <div className="text-gray-400 font-bold">
            <h6 className="text-sm mt-2"> {friendCount} {friendCount === 1 ? 'friend' : 'friends'} </h6>
        {friends.map(friend => (
            <button className= 'w-100 text-white display-block p-2 hover:underline duration-300 hover:scale-105' key= {friend._id}>
                <Link to={`/profile/${friend.username}`}>{friend.username}</Link>
            </button>
        ))}
        </div>
        </div>
    );
};

export default FriendList;