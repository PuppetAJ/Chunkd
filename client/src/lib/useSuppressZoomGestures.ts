import { useEffect } from "react";

/**
 * Stop trackpad and touch gestures zooming the page while the editor is open.
 * A trackpad pinch is a wheel event with `ctrlKey` set and needs a non-passive
 * listener; Safari has its own gesture events. `touch-action` does not help, a trackpad reports as a mouse.
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
