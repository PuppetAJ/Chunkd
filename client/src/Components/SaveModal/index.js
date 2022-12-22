import React from "react";

export const SaveModal = ({ setModalOn }) => {
  // Return JSX for SAVED Modal
  return (
    <div className="save-modal z-50 bg-opacity-80 fixed mt-20 z-75">
      <div className="flex justify-center items-center">
        <div className="flex-col justify-center bg-zinc-900 py-6 px-6 border-2 border-gray-300 rounded-xl">
          <div className="flex flex-col items-center w-full p-2">
            <div className="errorhandling flex flex-col items-center m-auto p-3 animate-pulse">
              <h1>Build Saved!</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
