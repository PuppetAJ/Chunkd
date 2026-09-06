import { useEditorUiStore } from "../../lib/editorUiStore.ts";

/** Shown while creative flight is on, so the current mode is never a guess. */
export default function FlightIndicator() {
  const flying = useEditorUiStore((state) => state.flying);
  if (!flying) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-6 left-6 z-50 rounded-lg border border-border bg-card/90 px-3 py-2 text-sm shadow-lg"
    >
      Flying &middot; space up, shift down
    </div>
  );
}
