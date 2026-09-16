import { useEffect } from "react";

import { clearDraft, writeDraft } from "./voxel/draft.ts";
import { useWorldStore } from "./voxel/worldStore.ts";

/** How long the world has to stand still before a draft is written. */
const SETTLE_MS = 8000;

/** How long to wait for a gap in the frame loop before writing anyway. */
const IDLE_LIMIT_MS = 2000;

/**
 * Keep a copy of the world in this browser while it is being built. Written
 * after building pauses rather than on every block, because encoding is costly.
 */
export function useWorldDraft(): void {
  useEffect(() => {
    let timer = 0;
    let idle = 0;

    const write = () => {
      const state = useWorldStore.getState();
      if (!state.edited) return;
      writeDraft({ savedAt: Date.now(), source: state.source, data: state.serialize() });
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // The timeout is not optional: the editor draws every frame, so the
        // page may never go idle.
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(write, { timeout: IDLE_LIMIT_MS });
        else write();
      }, SETTLE_MS);
    };

    const unsubscribe = useWorldStore.subscribe((state, previous) => {
      if (state.revision === previous.revision) return;
      if (!state.edited) {
        // A world that was just generated or loaded is not work in progress.
        window.clearTimeout(timer);
        return;
      }
      schedule();
    });

    // No time for an idle callback when the tab is closing.
    const onHide = () => {
      window.clearTimeout(timer);
      write();
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      window.removeEventListener("pagehide", onHide);
      // The draft is left behind on purpose; it is cleared when a build is saved.
    };
  }, []);
}

/** Called once a world has reached the server. */
export function draftSaved(): void {
  clearDraft();
  useWorldStore.getState().setEdited(false);
}
