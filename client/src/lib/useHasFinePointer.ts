import { useEffect, useState } from "react";

/**
 * `any-pointer: fine` rather than `pointer: coarse`, which would call a touchscreen
 * laptop a phone. Checking for Pointer Lock does not work: mobile browsers report it and then refuse it.
 */
const FINE_POINTER = "(any-pointer: fine)";

export function useHasFinePointer(): boolean {
  const [hasFinePointer, setHasFinePointer] = useState(
    () => window.matchMedia(FINE_POINTER).matches,
  );

  // A tablet can gain a trackpad partway through a session.
  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const update = () => setHasFinePointer(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return hasFinePointer;
}
