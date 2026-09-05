import { useEffect } from "react";

/**
 * Stop trackpad and touch gestures zooming the page while the editor is open.
 *
 * Zooming here is never wanted and is actively harmful: the crosshair is drawn
 * at the middle of the window, so a zoomed page aims somewhere other than where
 * the player is looking, and there is no obvious way back to 100%.
 *
 * Two routes are refusable from a page:
 *
 * - Pinching on a trackpad arrives as a wheel event with `ctrlKey` set. Every
 *   browser does this, and the listener has to be non-passive to refuse it.
 * - Safari has its own gesture events, which is also where a two-finger double
 *   tap arrives on macOS.
 *
 * `touch-action` in CSS does not help with any of this, despite looking like it
 * should: a trackpad reports itself as a mouse, so touch rules never apply to it.
 *
 * One route is not refusable. macOS decides a two-finger double tap is Smart
 * Zoom in the window server, after waiting to see whether a second tap arrives,
 * and hands the browser a gesture that is already a decision. Chrome performs
 * that zoom in the browser process without asking the page. Where that happens
 * the only cure is System Settings, Trackpad, Scroll & Zoom, Smart Zoom.
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
