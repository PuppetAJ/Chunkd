import React from 'react';


//Import Icons


const GameControlsModal = ({ setModalOn }) => {

    


    //Function to handle Modal click to add Post
    const handleCancelClick = () => {
        
        setModalOn(false)
    }



    // Return JSX for Post Modal
    return (

        <div className=" bg-zinc-800 bg-opacity-80 fixed inset-0 z-75">

            <div className="flex h-screen justify-center items-center ">

                <div className="flex-col justify-center bg-zinc-900 py-12 px-10 border-2 border-gray-300 rounded-xl">

                    <div className='flex flex-col items-center w-full p-2' >

                        <h1 html4="textarea" className="minecraft text-3xl text-white mb-8 flex items-center border-b-2">Controls</h1>

                        <div className="minecraft p-2 py-6 text-gray-300">
                            <p>Left-Click: Destroy Block</p>
                            <p>Right-Click: Place Block</p>
                            <p>WASD / Arrows: Move</p>
                            <p>Space: Jump</p>
                            <p>Hold Shift: Lower Speed</p>
                            <p>P: Save Build</p>
                            <p>Esc: Menu</p>
                        </div>


                    </div>

                    <div className="flex justify-center px-2">
                        <button onClick={handleCancelClick} className='btn-minecraft mt-2 duration-300 hover:scale-105'>Back</button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default GameControlsModal;