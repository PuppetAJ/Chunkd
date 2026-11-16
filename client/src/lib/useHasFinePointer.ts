import { useEffect, useState } from "react";

const FINE_POINTER = "(any-pointer: fine)";

export function useHasFinePointer(): boolean {
  const [hasFinePointer, setHasFinePointer] = useState(
    () => window.matchMedia(FINE_POINTER).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const update = () => setHasFinePointer(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return hasFinePointer;
}
