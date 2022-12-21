import React from 'react';


const SaveModal = ({ setModalOn }) => {

    


    //Function to handle Modal click to add Post
    // const handleCancelClick = () => {
        
    //     setModalOn(false)
    // }



    // Return JSX for SAVED Modal
    return (

        <div className=" bg-zinc-800 bg-opacity-80 fixed mt-20 z-75">

            <div className="flex h-screen justify-center items-center ">

                <div className="flex-col justify-center bg-zinc-900 py-6 px-6 border-2 border-gray-300 rounded-xl">

                    <div className='flex flex-col items-center w-full p-2'>


                        <div className="errorhandling flex flex-col items-center m-auto p-3 animate-pulse">
                         <h1>Build Saved!</h1>
                        </div>


                    </div>

                </div>
            </div>
        </div>
    );
}

export default SaveModal;