import { DataTexture, NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { TEXTURE_URLS } from "./voxel/blocks.ts";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

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

const PACK_BASE: string = import.meta.env["VITE_TEXTURE_PACK"] ?? "";

function overrideUrlFor(url: string): string | null {
  if (!PACK_BASE) return null;
  const name = NAME_BY_URL.get(url);
  return name ? `${PACK_BASE.replace(/\/$/, "")}/${name}.png` : null;
}

export function applyBlockTextureSettings(textures: Texture[]): void {
  for (const texture of textures) {
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }
}

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
