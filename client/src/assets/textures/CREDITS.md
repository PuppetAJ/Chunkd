# Block textures

## Where they come from

Every texture in this folder is Pixel Perfection, a 16x pack originally made by
XSSheep and continued by the community since.

- Community Edition: https://github.com/Athemis/PixelPerfectionCE, commit
  `28e38ca`, which is where 50 of the 65 files come from.
- Legacy: https://modrinth.com/resourcepack/pixel-perfection-legacy, version
  `26.2-88.0-1`, which is where the other 15 come from. The Community Edition
  stopped in 2021 at Minecraft 1.18, and those 15 are blocks the game added
  later: the cherry set, mud, packed mud, mud bricks, deepslate, deepslate
  tiles, tuff, calcite, dripstone and amethyst.
- The original release:
  https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/resource-packs/1242533-pixel-perfection-now-with-polar-bears-1-11

Both are the same pack under the same licence, so the two sets sit together
without a change in style.

## The licence

Pixel Perfection is under
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
XSSheep also gave permission in plain words on the original release:

> Feel free to use these textures in any mixpack, project, game or whatever you
> want (paid or unpaid). However, I'd appreciate it if I was credited for all
> the hard work I've put into these textures.

The licence asks for two things, both of which this project does.

1. Credit, with a link to the licence. It is in the site footer on every page,
   and in the in-game controls panel, since the editor covers the footer.
2. ShareAlike on anything adapted. The five tinted files below are adaptations
   and are offered under the same CC BY-SA 4.0 licence. The other 60 are
   unchanged copies, and the rest of this repository stays MIT: bundling images
   in an application is a collection rather than an adaptation of the images,
   which the licence treats separately.

## What was changed

60 of the 65 files are byte-for-byte copies and can be checked by hashing them
against the packs above.

Five are derived, because Minecraft stores them greyscale and colours them by
biome at runtime, which a single-biome world cannot do:

| File | How it was made |
|---|---|
| `grass_block_top.png` | tinted `#91BD59` |
| `grass_block_side.png` | the dirt side, with `grass_block_side_overlay` tinted `#91BD59` composited over it |
| `oak_leaves.png` | tinted `#77AB2F` |
| `birch_leaves.png` | tinted `#80A755` |
| `spruce_leaves.png` | tinted `#619961` |

`cherry_leaves.png` is not tinted, because Minecraft does not tint it either.

Tinting here is three steps rather than the straight multiply the game does:

1. Take the texture's luminance, which drops any colour cast it carries.
2. Scale that to an average of 0.58, the level Minecraft's own greyscale sits
   at.
3. Multiply by the biome colour.

Multiplying works on the game's own greyscale, which is neutral. Pixel
Perfection's grass and leaves are a warm grey instead, so a straight multiply
came out muddy and several shades too dark. Normalising first lands them at the
brightness the game produces, which is where they were under the pack this
replaced.

## Using a different texture pack

The file names here are Minecraft's own, so any Minecraft resource pack's
`assets/minecraft/textures/block` folder can stand in. Put the images in
`client/public/texturepack/` and set `VITE_TEXTURE_PACK=/texturepack` in
`client/.env.local`. Each block prefers the pack's image and falls back to the
bundled one, so a partial pack works.

Three things to know. Packs whose licences forbid redistribution, such as Sphax
PureBDCraft and Ashen 16x, can be used this way but must not be committed; the
`texturepack` directory is ignored by git for that reason. A raw pack will
supply the greyscale grass and leaves described above, which will look grey
until they are tinted the same way. And the override only reaches the 3D
materials, so the hotbar and inventory tiles keep showing the bundled art.
