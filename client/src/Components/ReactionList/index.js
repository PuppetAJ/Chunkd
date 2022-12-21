import React from 'react'
import { Link } from 'react-router-dom'

//Import Icons
import {FaRegCommentDots} from 'react-icons/fa';

const ReactionList = ({ reactions }) => {
    return (
        <div className="flex flex-col mb-1 rounded-lg">
            <div className="flex items-center">
                <div className="flex items-center text-light pl-3 duration-300 hover:scale-105"> <FaRegCommentDots size={18}/><span className="pl-2">Replies:</span> </div>
            </div>
            <div className="mx-2">
                {reactions &&
                    reactions.map(reaction => (
                        <p className=" p-1 my-2 rounded-lg" key={reaction._id}>
                            {reaction.reactionBody} {'// '}
                            <Link to={`/profile/${reaction.username}`} className="text-xs hover:underline" >
                                {reaction.username} on {reaction.createdAt}
                            </Link>
                        </p>
                    ))}
            </div>
        </div>
    )
}

export default ReactionList