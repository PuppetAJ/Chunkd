import { useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { useMutation } from "@apollo/client/react";

import { SAVE_BUILD } from "../../utils/mutations.ts";
import { QUERY_ME } from "../../utils/queries.ts";
import { useKeyPress } from "../../lib/useKeyboard.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";
import { BUILD_FORMAT_VERSION } from "../../lib/voxel/format.ts";
import { useEditorUiStore } from "../../lib/editorUiStore.ts";

const THUMBNAIL_WIDTH = 480;

/**
 * Saves the world when P is pressed.
 *
 * Lives inside the Canvas because taking the thumbnail needs the renderer.
 */
export default function SaveControls() {
  const { gl, scene, camera } = useThree();
  const setSaveStatus = useEditorUiStore((state) => state.setSaveStatus);
  const [saveBuild] = useMutation(SAVE_BUILD, { refetchQueries: [QUERY_ME] });

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

  useKeyPress(async (code) => {
    if (code !== "KeyP") return;
    if (useEditorUiStore.getState().saveStatus === "saving") return;

    setSaveStatus("saving", "Saving...");
    try {
      const data = useWorldStore.getState().serialize();
      const thumbnail = captureThumbnail();
      await saveBuild({
        variables: { name: "Untitled build", data, thumbnail, format: BUILD_FORMAT_VERSION },
      });
      setSaveStatus("saved", "Build saved");
    } catch (error) {
      setSaveStatus("error", error instanceof Error ? error.message : "Could not save");
    } finally {
      window.setTimeout(() => useEditorUiStore.getState().setSaveStatus("idle"), 2500);
    }
  });

  return null;
}
