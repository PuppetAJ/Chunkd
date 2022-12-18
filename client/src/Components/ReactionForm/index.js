import React, { useState } from 'react';
import {useMutation} from '@apollo/client';
import {ADD_REACTION} from '../../utils/mutations';

const ReactionForm = ({ thoughtId }) => {
    const [reactionBody, setBody] = useState('');
    const [characterCount, setCharacterCount] = useState(0);

    const [addReaction, {error}] = useMutation(ADD_REACTION);

 // update state based on form input changes
 const handleChange = (event) => {
  if (event.target.value.length <= 280) {
    setBody(event.target.value);
    setCharacterCount(event.target.value.length);
  }
};

// submit form
const handleFormSubmit = async (event) => {
  event.preventDefault();

  try {
    await addReaction({
      variables: { reactionBody, thoughtId },
    });

    // clear form value
    setBody('');
    setCharacterCount(0);
  } catch (e) {
    console.error(e);
  }
};



  return (

    <div className="flex-col m-auto">
      <p className={`text-sm dark:placeholder-gray-400 m-0 ${characterCount === 280 || error ? 'text-error' : ''}`}>
        Character Count: {characterCount}/280
        {error && <span className="ml-2">Something went wrong...</span>}
      </p>
      <form className="flex-row justify-center justify-space-between-md align-stretch" onSubmit={handleFormSubmit}>
       
        <textarea
          placeholder="What do you think?" value={reactionBody}
          className="form-input flex w-auto  dark:bg-gray-700" onChange={handleChange}
        ></textarea>
       

        <button className="btn-minecraft duration-300 hover:scale-105" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
};

export default ReactionForm;