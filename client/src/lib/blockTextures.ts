import { NearestFilter, NoColorSpace, type Texture } from "three";

// The block textures are greyscale masks that get tinted by each material's
// colour, not full-colour images.
//
// three.js r152 turned on colour management, which reads any texture tagged as
// sRGB into linear space. Doing that to a mask darkens it by roughly a factor of
// two, and the tint colour gets the same treatment, so the two together made the
// whole world render almost black. Tagging these as plain data keeps the mask
// values as authored, which is what they are.
//
// NearestFilter on magnification is what keeps the blocks looking like pixel art
// instead of a blur when you stand next to them.
export function applyBlockTextureSettings(...textures: (Texture | undefined)[]): void {
  for (const texture of textures) {
    if (!texture || texture.colorSpace === NoColorSpace) continue;
    texture.colorSpace = NoColorSpace;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
  }
}
