import { useEffect, useRef, type RefObject } from "react";

/**
 * The set of keys currently held down.
 *
 * A ref rather than state: movement reads this every frame and re-rendering the
 * scene on each key change would be pointless work.
 */
export function useHeldKeys(): RefObject<Set<string>> {
  const held = useRef<Set<string>>(new Set());

  useEffect(() => {
    const down = (event: KeyboardEvent) => held.current.add(event.code);
    const up = (event: KeyboardEvent) => held.current.delete(event.code);
    // Releasing a key while the tab is hidden never fires keyup, which would
    // otherwise leave the player walking forever.
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

/**
 * Run a handler once per press, on the way down.
 *
 * Actions like choosing a hotbar slot or saving are events, not states. The old
 * code sampled them inside the render loop, so holding the key fired them on
 * every frame and a quick tap could be missed entirely.
 */
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
