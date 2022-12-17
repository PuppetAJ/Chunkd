import React from 'react'
import { Link } from 'react-router-dom'

//Import Icons
import {FaRegComments} from 'react-icons/fa';

const ReactionList = ({ reactions }) => {
    return (
        <div className="mb-3">
            <div className="">
                <span className="text-light"> < FaRegComments size={18}/> </span>
            </div>
            <div className="">
                {reactions &&
                    reactions.map(reaction => (
                        <p className="pill mb-3" key={reaction._id}>
                            {reaction.reactionBody} {'// '}
                            <Link to={`/profile/${reaction.username}`} style={{ fontWeight: 700 }}>
                                {reaction.username} on {reaction.createdAt}
                            </Link>
                        </p>
                    ))}
            </div>
        </div>
    )
}

export default ReactionList