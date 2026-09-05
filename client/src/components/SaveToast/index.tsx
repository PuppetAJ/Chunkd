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
      className={`errorhandling fixed bottom-28 right-6 z-50 rounded ${
        status === "error" ? "text-red-300" : ""
      }`}
    >
      {message}
    </div>
  );
}
