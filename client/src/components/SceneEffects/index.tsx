import { BrightnessContrast, EffectComposer, HueSaturation, SSAO } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * A pass over the finished image, for the depth and colour the renderer alone
 * does not give.
 *
 * Two things are going on. Ambient occlusion darkens the places blocks meet,
 * which is what makes a voxel scene read as depth rather than as flat colour:
 * the games this borrows from bake the same thing into their lighting. And the
 * colour is lifted back, because the AgX curve the renderer uses is accurate
 * but reserved, and the scene lost some life when it replaced the filmic one.
 *
 * The numbers are deliberately small. Heavy occlusion turns every seam into a
 * black line, and a large saturation lift undoes the point of rendering the
 * pack's own colours faithfully.
 */
export default function SceneEffects() {
  return (
    <EffectComposer enableNormalPass>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        // The radius is a fraction of the camera's far plane rather than a
        // distance in blocks, and the far plane is 400 blocks out, so this is
        // about two blocks. Anything larger stops being a corner shadow and
        // starts smudging whole walls.
        radius={0.005}
        intensity={16}
        // Bright surfaces keep their brightness. Without this the tops of a
        // sunlit field pick up grey patches from the blocks beside them.
        luminanceInfluence={0.5}
        // Enough to keep the shading smooth on a flat wall. Fewer samples show
        // up as banding where a face meets the floor.
        samples={16}
        rings={4}
        worldDistanceThreshold={40}
        worldDistanceFalloff={8}
        worldProximityThreshold={1}
        worldProximityFalloff={0.5}
      />
      <HueSaturation saturation={0.12} />
      <BrightnessContrast contrast={0.06} />
    </EffectComposer>
  );
}
