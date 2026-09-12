import { useEffect } from "react";

/**
 * Stop trackpad and touch gestures zooming the page while the editor is open: a
 * zoomed page aims the crosshair somewhere other than where the player looks.
 *
 * Two routes are refusable. A trackpad pinch arrives as a wheel event with
 * `ctrlKey` set, and the listener must be non-passive to refuse it; Safari has
 * its own gesture events. `touch-action` does not help, because a trackpad
 * reports itself as a mouse.
 *
 * A two-finger double tap on macOS is not refusable: the system decides it is
 * Smart Zoom before the page sees anything.
 */
export function useSuppressZoomGestures(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const refuse = (event: Event) => event.preventDefault();
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };

    const gestures = ["gesturestart", "gesturechange", "gestureend"];
    window.addEventListener("wheel", onWheel, { passive: false });
    for (const name of gestures) document.addEventListener(name, refuse);

    return () => {
      window.removeEventListener("wheel", onWheel);
      for (const name of gestures) document.removeEventListener(name, refuse);
    };
  }, [active]);
}
