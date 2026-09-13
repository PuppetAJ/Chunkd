import { useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { useKeyPress } from "../../lib/useKeyboard.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { useEditorUiStore } from "../../lib/editorUiStore.ts";

const THUMBNAIL_WIDTH = 480;

/**
 * Captures the world when P is pressed.
 *
 * Lives inside the Canvas because taking the thumbnail needs the renderer. It
 * does not save: it hands the encoded world and the picture to the naming
 * dialog, which lives outside the canvas because it needs ordinary DOM focus.
 */
export default function SaveControls() {
  const { gl, scene, camera } = useThree();

  const captureThumbnail = useCallback((): string | undefined => {
    try {
      // The drawing buffer is cleared after each frame unless the context is
      // created with preserveDrawingBuffer, which costs performance on every
      // frame for a picture taken once. Rendering here and reading immediately,
      // before the browser composites, gets the image without that cost.
      gl.render(scene, camera);
      const full = gl.domElement;
      const scaled = document.createElement("canvas");
      scaled.width = THUMBNAIL_WIDTH;
      scaled.height = Math.round((full.height / full.width) * THUMBNAIL_WIDTH);
      const context = scaled.getContext("2d");
      if (!context) return undefined;
      context.drawImage(full, 0, 0, scaled.width, scaled.height);
      return scaled.toDataURL("image/jpeg", 0.7);
    } catch {
      // A thumbnail is a nicety; never fail a save over one.
      return undefined;
    }
  }, [gl, scene, camera]);

  useKeyPress((code, _shift, event) => {
    if (code !== "KeyP") return;
    const ui = useEditorUiStore.getState();
    if (ui.saveStatus === "saving" || ui.pendingSave) return;
    // The pause screen is inert; P there should not capture a world.
    if (!ui.playing) return;
    // The dialog this opens focuses its name box at once, and the same
    // keystroke would otherwise type a "p" into it.
    event.preventDefault();

    // Typing a name needs the cursor back.
    if (document.pointerLockElement) document.exitPointerLock();
    ui.setPendingSave({
      data: useWorldStore.getState().serialize(),
      thumbnail: captureThumbnail(),
    });
  });

  return null;
}
