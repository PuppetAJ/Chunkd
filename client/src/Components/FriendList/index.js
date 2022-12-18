import React from 'react';
import {Link} from 'react-router-dom';

const FriendList = ({friendCount, username, friends}) => {

    if (!friends || !friends.length) {
        return <p className= 'text-center text-gray-400 text-lg rounded-lg p-2 mt-2'>{username}, you haven't added any friends yet.</p>;
    }

    return (
        <div className="text-white text-xl font-bold">
            <h5> {username}'s {friendCount} {friendCount === 1 ? 'friend' : 'friends'} </h5>
        {friends.map(friend => (
            <button className= 'w-100 text-gray-400 display-block p-2 hover:underline' key= {friend._id}>
                <Link to={`/profile/${friend.username}`}>{friend.username}</Link>
            </button>
        ))}
        </div>
    );
};

export default FriendList;