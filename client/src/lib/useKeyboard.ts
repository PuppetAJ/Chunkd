import { useEffect, useRef, type RefObject } from "react";

/** The keys currently held down. A ref, not state: movement reads it every frame. */
export function useHeldKeys(): RefObject<Set<string>> {
  const held = useRef<Set<string>>(new Set());

  useEffect(() => {
    const down = (event: KeyboardEvent) => held.current.add(event.code);
    const up = (event: KeyboardEvent) => held.current.delete(event.code);
    // Releasing a key while the tab is hidden never fires keyup.
    const clear = () => held.current.clear();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  return held;
}

/** Run a handler once per press, on the way down. */
export function useKeyPress(
  handler: (code: string, shift: boolean, event: KeyboardEvent) => void,
): void {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      latest.current(event.code, event.shiftKey, event);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);
}
