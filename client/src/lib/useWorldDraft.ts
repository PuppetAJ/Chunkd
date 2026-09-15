import { useEffect } from "react";

import { clearDraft, writeDraft } from "./voxel/draft.ts";
import { useWorldStore } from "./voxel/worldStore.ts";

/** How long the world has to stand still before a draft is written. */
const SETTLE_MS = 8000;

/** How long to wait for a gap in the frame loop before writing anyway. */
const IDLE_LIMIT_MS = 2000;

/**
 * Keep a copy of the world in this browser while it is being built.
 *
 * Written after building pauses rather than on every block, because encoding a
 * world walks the terrain the save is a difference against: ten milliseconds on
 * a small world and about a hundred on the largest one offered.
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
        // Encoding is the most expensive thing the editor does off the frame
        // loop, so it waits for a gap rather than taking one. The timeout is
        // not optional: the editor draws every frame, so a page that never goes
        // idle would otherwise never write a draft at all.
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

    // A tab being closed or hidden is exactly the case this exists for, and
    // there is no time for an idle callback there.
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
      // Leaving the editor with work that was never saved still leaves the
      // draft behind on purpose. It is cleared when a build is saved.
    };
  }, []);
}

/** Called once a world has reached the server, where drafts are no longer what stands between it and being lost. */
export function draftSaved(): void {
  clearDraft();
  useWorldStore.getState().setEdited(false);
}
