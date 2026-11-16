import { useEffect } from "react";

import { clearDraft, writeDraft } from "./voxel/draft.ts";
import { useWorldStore } from "./voxel/worldStore.ts";

const SETTLE_MS = 8000;

const IDLE_LIMIT_MS = 2000;

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
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(write, { timeout: IDLE_LIMIT_MS });
        else write();
      }, SETTLE_MS);
    };

    const unsubscribe = useWorldStore.subscribe((state, previous) => {
      if (state.revision === previous.revision) return;
      if (!state.edited) {
        window.clearTimeout(timer);
        return;
      }
      schedule();
    });

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
    };
  }, []);
}

export function draftSaved(): void {
  clearDraft();
  useWorldStore.getState().setEdited(false);
}
