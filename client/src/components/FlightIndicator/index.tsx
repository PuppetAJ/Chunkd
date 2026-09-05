import { useEditorUiStore } from "../../lib/editorUiStore.ts";

/** Shown while creative flight is on, so the current mode is never a guess. */
export default function FlightIndicator() {
  const flying = useEditorUiStore((state) => state.flying);
  if (!flying) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="errorhandling pointer-events-none fixed left-6 top-24 z-50 rounded"
    >
      Flying &middot; space up, shift down
    </div>
  );
}
