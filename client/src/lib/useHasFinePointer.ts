import { useEffect, useState } from "react";

/**
 * Does this device have a precise pointer, such as a mouse or a trackpad?
 *
 * The editor is keyboard and mouse only. Movement is WASD, aiming is mouse
 * look through the Pointer Lock API, and the hotbar is the number keys and the
 * scroll wheel. None of that has a touch equivalent yet.
 *
 * `any-pointer: fine` is the right question to ask. `pointer: coarse` only
 * describes the primary pointer, so a laptop with a touchscreen would look like
 * a phone, and an iPad with a trackpad attached would look like a tablet even
 * though the editor works perfectly well on it. Asking whether *any* precise
 * pointer is available gets both of those right.
 *
 * Checking for the Pointer Lock API instead does not work. Every modern browser
 * reports it as present, including mobile ones that then refuse to grant it.
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
