import { useEffect, useState } from "react";

/**
 * Does this device have a precise pointer? The editor is keyboard and mouse
 * only, and none of it has a touch equivalent yet.
 *
 * `any-pointer: fine` rather than `pointer: coarse`, which describes only the
 * primary pointer and would call a touchscreen laptop a phone. Checking for the
 * Pointer Lock API does not work: mobile browsers report it and then refuse it.
 */
const FINE_POINTER = "(any-pointer: fine)";

export function useHasFinePointer(): boolean {
  const [hasFinePointer, setHasFinePointer] = useState(
    () => window.matchMedia(FINE_POINTER).matches,
  );

  // A tablet can gain a trackpad partway through a session, so this listens
  // rather than deciding once. Attaching a keyboard case makes the editor
  // available without a reload.
  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const update = () => setHasFinePointer(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return hasFinePointer;
}
