import React, { useEffect, useState } from "react";
import { useSelectedStore } from "../Player";

export const Hotbar = ({ setModalOn }) => {
  const selected = useSelectedStore((state) => state.selected);
  const [selText, setSelText] = useState();

  useEffect(() => {
    if (selected === "1" || !selected) {
      setSelText("Dirt");
    } else if (selected === "2") {
      setSelText("Grass");
    } else if (selected === "3") {
      setSelText("Glass");
    } else if (selected === "4") {
      setSelText("Cobblestone");
    } else if (selected === "5") {
      setSelText("Log");
    } else if (selected === "6") {
      setSelText("Planks");
    } else if (selected === "7") {
      setSelText("Leaves");
    } else if (selected === "8") {
      setSelText("Bricks");
    } else if (selected === "9") {
      setSelText("Stone Bricks");
    }
  }, [selected]);

  // Return JSX for SAVED Modal
  return (
    <div className="hotbar z-50 bg-opacity-80 fixed mt-20 z-75">
      <div className="flex justify-center items-center">
        <div className="flex-col justify-center bg-zinc-900 py-6 px-6 border-2 border-gray-300 rounded-xl">
          <div className="flex flex-col items-center w-full p-2">
            <div className="errorhandling flex flex-col items-center m-auto p-3">
              <h1>Selected: {selText}</h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
