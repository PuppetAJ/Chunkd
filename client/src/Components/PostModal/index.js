import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { ADD_THOUGHT } from '../../utils/mutations';
import { QUERY_THOUGHTS, QUERY_ME } from '../../utils/queries';

//Import Icons
import { ImPlus } from 'react-icons/im';


const PostModal = ({ setModalOn, setChoice }) => {

    const [thoughtText, setText] = useState('');
    const [characterCount, setCharacterCount] = useState(0);

    //Declare addthought function and error variable
    const [addThought, { error }] = useMutation(ADD_THOUGHT, {
        update(cache, { data: { addThought } }) {
            //read what's currently in the cache
            //Could potentially not exist yet so wrap in try/catch
            try {
                //update Me array's cache
                const { me } = cache.readQuery({ query: QUERY_ME });
                cache.writeQuery({
                    query: QUERY_ME,
                    data: { me: { ...me, thoughts: [...me.thoughts, addThought] } },
                });
            } catch (e) {
                console.warn('First thought insertion by user!')
            }

            //update thought array's cache
            const { thoughts } = cache.readQuery({ query: QUERY_THOUGHTS });

            //prepend the newest thought to the front of the array
            cache.writeQuery({
                query: QUERY_THOUGHTS,
                data: { thoughts: [addThought, ...thoughts] },
            });
        }
    });



    const handleChange = event => {
        if (event.target.value.length <= 280) {
            setText(event.target.value);
            setCharacterCount(event.target.value.length);
        }
    };

    //Function to handle Modal click to add Post
    const handleOKClick = async event => {
        event.preventDefault();

        try {
            //add thought to database
            await addThought({
                variables: { thoughtText }
            });

            //clear form value
            setText('');
            setCharacterCount(0);
        } catch (e) {
            console.error(e);
        }

        setChoice(true)
        setModalOn(false)
    };

    const handleCancelClick = () => {
        setChoice(false)
        setModalOn(false)
    }



    // Return JSX for Post Modal
    return (

        <div className="  bg-zinc-800 bg-opacity-80 fixed inset-0 z-100   ">

            <div className="flex h-screen justify-center items-center ">

                <div className="flex-col justify-center bg-zinc-900 py-12 px-16 border-2 border-gray-300 rounded-xl w-1/2 ">

                    <form className='flex flex-col items-center w-full p-2' >

                        <p html4="textarea" className="minecraft text-3xl text-white mb-8 flex items-center border-b-2"><ImPlus size={18} /><span className="flex ml-3">Add Post</span></p>

                        <p className={` text-xs text-gray-400 mb-1  ${characterCount === 280 || error ? 'text-error' : ''}`}>
                            Character Count: {characterCount}/280
                            {error && <span className="ml-2">Something went wrong...</span>}
                        </p>
                        <textarea placeholder="Share something new!" value={thoughtText} name="textarea" className=' block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500' rows='4' onChange={handleChange}> </textarea>


                    </form>

                    <div className="flex justify-evenly px-2">
                        <button onClick={handleOKClick} className='btn-minecraft mt-2 duration-300 hover:scale-105' type="submit">Post</button>
                        <button onClick={handleCancelClick} className='btn-minecraft mt-2 duration-300 hover:scale-105'>Cancel</button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default PostModal;