import { DataTexture, NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { TEXTURE_URLS } from "./voxel/blocks.ts";

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
 * Every texture file in the assets folder, as a path to its built URL.
 *
 * The block table imports the files it needs by name, which is what catches a
 * typo at build time. This map exists alongside those imports for one reason:
 * it is the only way to recover a texture's original file name from the
 * fingerprinted URL a production build gives it, and the texture pack override
 * below needs that name.
 */
const SOURCE_FILES = import.meta.glob("../assets/textures/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const NAME_BY_URL = new Map(
  Object.entries(SOURCE_FILES).map(([path, url]) => [
    url,
    path.slice(path.lastIndexOf("/") + 1).replace(/\.png$/, ""),
  ]),
);

/**
 * Where to look for replacement textures, if anywhere.
 *
 * Packs like Sphax PureBDCraft and Ashen are free to download but their licences
 * forbid redistributing the files, so they cannot live in this repository. Set
 * VITE_TEXTURE_PACK to a folder you have put them in and each block will prefer
 * the pack's image, falling back to the bundled one whenever the pack does not
 * have that particular texture. Unset, this costs nothing at all.
 */
const PACK_BASE: string = import.meta.env["VITE_TEXTURE_PACK"] ?? "";

function overrideUrlFor(url: string): string | null {
  if (!PACK_BASE) return null;
  const name = NAME_BY_URL.get(url);
  return name ? `${PACK_BASE.replace(/\/$/, "")}/${name}.png` : null;
}

/**
 * These are ordinary colour images authored to be looked at, so sRGB is the
 * correct tag: three then reads them into linear space to shade with and
 * converts back on output, and the colours come out as drawn. The previous
 * texture set was greyscale masks that were tinted at runtime, which is why this
 * used to force the opposite, and leaving that in place washed everything out.
 *
 * NearestFilter is what keeps 16 by 16 art looking like pixel art rather than a
 * blur when you stand next to it, on both magnification and minification. Using
 * mipmaps here would average a block's edge pixels into its neighbours, which is
 * especially visible on glass, whose texture is a frame around nothing.
 */
export function applyBlockTextureSettings(textures: Texture[]): void {
  for (const texture of textures) {
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }
}

/** A single white pixel, so a block whose image is missing still renders. */
function blankTexture(): Texture {
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

function loadOnce(url: string): Promise<Texture | null> {
  return new Promise((resolve) => {
    new TextureLoader().load(
      url,
      (texture) => resolve(texture),
      undefined,
      () => resolve(null),
    );
  });
}

async function loadTexture(url: string): Promise<Texture> {
  // A pack only has to supply the textures it wants to replace, so a miss here
  // is ordinary and falls through to the bundled image without complaint.
  const override = overrideUrlFor(url);
  if (override) {
    const replaced = await loadOnce(override);
    if (replaced) return replaced;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const texture = await loadOnce(url);
    if (texture) return texture;
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  console.error(`Could not load ${url} after ${MAX_ATTEMPTS} attempts; drawing that block untextured.`);
  return blankTexture();
}

/** Texture URL to the loaded texture. */
export type BlockTextures = Map<string, Texture>;

let pending: Promise<BlockTextures> | null = null;

/**
 * The same promise every time, so the images are fetched once for the life of
 * the tab and both the editor and the saved-build viewer share them.
 *
 * It never rejects, which is the point: `use()` on a rejected promise throws
 * into the nearest error boundary, and that is exactly the crash this avoids.
 */
export function loadBlockTextures(): Promise<BlockTextures> {
  pending ??= Promise.all(TEXTURE_URLS.map((url) => loadTexture(url))).then((loaded) => {
    applyBlockTextureSettings(loaded);
    const byUrl: BlockTextures = new Map();
    TEXTURE_URLS.forEach((url, index) => byUrl.set(url, loaded[index]!));
    return byUrl;
  });
  return pending;
}
