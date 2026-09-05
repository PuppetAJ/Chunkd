import { DataTexture, NearestFilter, NoColorSpace, TextureLoader, type Texture } from "three";
import { BLOCKS } from "./voxel/blocks.ts";

/**
 * Loading the block textures, once, in a way that cannot take the editor down.
 *
 * Textures used to be loaded with drei's `useTexture`, which throws when an
 * image fails. Nothing inside the Canvas catches that, so the throw reached the
 * page-level error boundary, which unmounted the Canvas and destroyed the WebGL
 * context along with whatever was being built. One image failing to arrive is
 * not worth losing someone's work over, so this retries, and if it still cannot
 * get the image it hands back a blank texture and lets the block render as a
 * flat colour.
 */

/** A failed image is usually a hiccup, so ask again before giving up. */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

/**
 * The block textures are greyscale masks that get tinted by each material's
 * colour, not full-colour images.
 *
 * three.js r152 turned on colour management, which reads any texture tagged as
 * sRGB into linear space. Doing that to a mask darkens it by roughly a factor of
 * two, and the tint colour gets the same treatment, so the two together made the
 * whole world render almost black. Tagging these as plain data keeps the mask
 * values as authored, which is what they are.
 *
 * NearestFilter on magnification is what keeps the blocks looking like pixel art
 * instead of a blur when you stand next to them. It matters most to glass: its
 * texture is a frame around fully transparent pixels, and blending across that
 * edge both thins the frame and drags its colour toward the transparent black
 * behind it.
 *
 * This has to be re-applied after react-three-fiber assigns the texture to a
 * material's `map`, because r3f tags anything it puts there as sRGB. That is the
 * right guess for a photograph and the wrong one for a mask, so BlockLayer calls
 * this again once the material exists.
 */
export function applyBlockTextureSettings(textures: Texture[]): void {
  for (const texture of textures) {
    texture.colorSpace = NoColorSpace;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
  }
}

/** A single white pixel, so a block whose image is missing still takes its tint. */
function blankTexture(): Texture {
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

function loadTexture(url: string, attempt = 1): Promise<Texture> {
  return new Promise((resolve) => {
    new TextureLoader().load(
      url,
      (texture) => resolve(texture),
      undefined,
      () => {
        if (attempt < MAX_ATTEMPTS) {
          setTimeout(() => resolve(loadTexture(url, attempt + 1)), RETRY_DELAY_MS * attempt);
          return;
        }
        console.error(`Could not load ${url} after ${MAX_ATTEMPTS} attempts; drawing that block untextured.`);
        resolve(blankTexture());
      },
    );
  });
}

/** Block name to its texture. */
export type BlockTextures = Record<string, Texture>;

let pending: Promise<BlockTextures> | null = null;

/**
 * The same promise every time, so the images are fetched once for the life of
 * the tab and both the editor and the saved-build viewer share them.
 *
 * It never rejects, which is the point: `use()` on a rejected promise throws
 * into the nearest error boundary, and that is exactly the crash this avoids.
 */
export function loadBlockTextures(): Promise<BlockTextures> {
  pending ??= Promise.all(BLOCKS.map((block) => loadTexture(block.textureUrl))).then((loaded) => {
    applyBlockTextureSettings(loaded);
    const byName: BlockTextures = {};
    BLOCKS.forEach((block, index) => {
      byName[block.name] = loaded[index]!;
    });
    return byName;
  });
  return pending;
}
