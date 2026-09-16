import { useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { useKeyPress } from "../../lib/useKeyboard.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { useEditorUiStore } from "../../lib/editorUiStore.ts";

const THUMBNAIL_WIDTH = 480;

/**
 * Captures the world when P is pressed. Inside the Canvas because the thumbnail
 * needs the renderer; the naming dialog lives outside it, where focus works.
 */
export default function SaveControls() {
  const { gl, scene, camera } = useThree();

  const captureThumbnail = useCallback((): string | undefined => {
    try {
      // Rendering and reading back at once avoids preserveDrawingBuffer, which
      // costs every frame for a picture taken once.
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
    if (!ui.playing) return;
    // Or the same keystroke types a "p" into the dialog's name box.
    event.preventDefault();

    if (document.pointerLockElement) document.exitPointerLock();
    ui.setPendingSave({
      data: useWorldStore.getState().serialize(),
      thumbnail: captureThumbnail(),
    });
  });

  return null;
}
