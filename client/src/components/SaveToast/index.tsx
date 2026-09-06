import { useEditorUiStore } from "../../lib/editorUiStore.ts";

/**
 * Feedback for saving a build.
 *
 * Replaces a hidden element whose CSS classes were toggled by reaching into the
 * DOM from inside the render loop.
 */
export default function SaveToast() {
  const status = useEditorUiStore((state) => state.saveStatus);
  const message = useEditorUiStore((state) => state.saveMessage);

  if (status === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-6 bottom-28 z-50 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg ${
        status === "error" ? "text-destructive" : ""
      }`}
    >
      {message}
    </div>
  );
}
