import React, {useState} from 'react';
import {useMutation} from '@apollo/client';
import {ADD_THOUGHT} from '../../utils/mutations';
import {QUERY_THOUGHTS, QUERY_ME} from '../../utils/queries';


const ThoughtForm = ()=> {
    const [thoughtText, setText] = useState('');
    const [characterCount, setCharacterCount] = useState(0);

    //Declare addthought function and error variable
    const [addThought, {error}] = useMutation(ADD_THOUGHT, {
        update(cache, {data: {addThought}}) {
            //read what's currently in the cache
            //Could potentially not exist yet so wrap in try/catch
            try { 
                //update Me array's cache
                const {me} = cache.readQuery({ query: QUERY_ME});
                cache.writeQuery({
                    query: QUERY_ME,
                    data: {me : {...me, thoughts: [...me.thoughts, addThought]}},
                });
            } catch (e) {
                console.warn('First thought insertion by user!')
            }

            //update thought array's cache
            const {thoughts} = cache.readQuery({query: QUERY_THOUGHTS});

            //prepend the newest thought to the front of the array
            cache.writeQuery({
                query: QUERY_THOUGHTS,
                data: {thoughts: [addThought, ...thoughts]},
            });
        }
    });

    

    const handleChange = event => {
        if(event.target.value.length <= 280) {
            setText(event.target.value);
            setCharacterCount(event.target.value.length);
        }
    };


    const handleFormSubmit = async event => {
        event.preventDefault();

        try {
            //add thought to database
            await addThought({
                variables: {thoughtText}
            });

            //clear form value
            setText('');
            setCharacterCount(0);
        } catch (e) {
            console.error(e);
        }
    };


    //returning JSX
    return (
       
          <div className='w-full'>
            
            <form className='flex flex-col items-center p-2' onSubmit={handleFormSubmit}>
                <label html4="textarea" className="text-3xl text-white mb-4">Post:</label>
                <textarea placeholder= "Share something new!"  value={thoughtText} name="textarea" className=' block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500' rows='4' columns='5' onChange={handleChange}> </textarea>

                <p className= {`text-lg text-gray-500 m-0 ${characterCount === 280 || error ? 'text-error' : ''}`}>
                {error && <span className= 'ml-2'>Something went wrong..</span>}
            </p>
        
           
                <button className='btn-minecraft m-2' type='submit'>Submit</button>
             


            </form>
            </div>
    );
};

export default ThoughtForm;

