import { DataTexture, NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { TEXTURE_URLS } from "./voxel/blocks.ts";

/**
 * Loads the block textures without ever throwing: a throw inside the Canvas
 * unmounts the editor and loses the world, so a missing image retries and then falls back to a blank texture.
 */

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

/** The only way back from a build's fingerprinted URL to the file name, which the pack override needs. */
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

/** Set VITE_TEXTURE_PACK to a folder to prefer its images over the bundled ones. */
const PACK_BASE: string = import.meta.env["VITE_TEXTURE_PACK"] ?? "";

function overrideUrlFor(url: string): string | null {
  if (!PACK_BASE) return null;
  const name = NAME_BY_URL.get(url);
  return name ? `${PACK_BASE.replace(/\/$/, "")}/${name}.png` : null;
}

/**
 * sRGB because these are colour images. NearestFilter and no mipmaps keep
 * pixel art crisp; mipmaps bleed a block's edge pixels into its neighbours.
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
  // A pack only has to supply the textures it replaces, so a miss is ordinary.
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

/** One shared promise. It never rejects: `use()` on a rejected promise throws into the error boundary. */
export function loadBlockTextures(): Promise<BlockTextures> {
  pending ??= Promise.all(TEXTURE_URLS.map((url) => loadTexture(url))).then((loaded) => {
    applyBlockTextureSettings(loaded);
    const byUrl: BlockTextures = new Map();
    TEXTURE_URLS.forEach((url, index) => byUrl.set(url, loaded[index]!));
    return byUrl;
  });
  return pending;
}
