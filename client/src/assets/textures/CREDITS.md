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
2. ShareAlike on anything adapted. Every texture here is adapted, as the next
   section describes, so all of them are offered under the same CC BY-SA 4.0
   licence. The rest of this repository stays MIT: bundling images in an
   application is a collection rather than an adaptation of the images, which
   the licence treats separately.

## What was changed

Every file here is adapted rather than copied, in two steps.

### The dark end, and the colour, on all 65

Each texture has its darkest pixels raised and its colour pushed a little
further from grey. Neither step moves a texture's average brightness, so the
pack still reads as itself; what changes is the bottom of its range and how
saturated it is.

The reason is the renderer. It draws through a filmic curve, which the game
does not, and that curve is steep at the bottom: the dark grain of a spruce log
came out of it as a black mass rather than as wood. Lifting the dark end in the
texture, by scaling each pixel's own colour rather than adding grey light to
it, is the one correction that costs no colour and no frames. The numbers are
a power of 0.7 on the luminance, renormalised to hold the average, and a
saturation of 1.25.

### The four that are tinted

| File | How it was made |
|---|---|
| `grass_block_top.png` | tinted with Minecraft's plains grass colour, `#91BD59` |
| `grass_block_side.png` | the pack's own side, with `grass_block_side_overlay` tinted `#91BD59` composited over it |
| `oak_leaves.png` | tinted with Minecraft's plains foliage colour, `#77AB2F` |
| `grass_block_snow.png` | only the green of the snow edge, tinted `#91BD59` |

The first three exist because Minecraft stores those textures greyscale and
colours them by biome at runtime, which a single-biome world cannot do. Birch,
spruce and cherry leaves are left alone: this pack paints them in their final
colours, birch as golden autumn leaves rather than green, so tinting them would
undo the artwork.

Tinting takes the texture's luminance, raises it to the power 0.7, scales the
result so its average is 0.58, the level Minecraft's own greyscale sits at, and
multiplies by the colour.

The colours are Minecraft's own rather than the pack's. Pixel Perfection ships
replacement colour maps whose plains grass is `#6DC475`, a cooler and greener
thing than Minecraft's `#91BD59`, and both were tried on screen. The olive cast
of Minecraft's own numbers is the one this project kept.

`grass_block_snow.png` is the odd one out. Minecraft does not tint it at all,
and the pack paints its grass edge several shades darker than the tint
produces, which beside a normal grass block read as a black line under the
snow. Only the green pixels of it are redone.

### Rebuilding them

None of this is done by hand, and none of it is reversible from the files
themselves: to change a number, take the two packs listed above and run the
steps again in the order they appear here.

## Using a different texture pack

The file names here are Minecraft's own, so any Minecraft resource pack's
`assets/minecraft/textures/block` folder can stand in. Put the images in
`client/public/texturepack/` and set `VITE_TEXTURE_PACK=/texturepack` in
`client/.env.local`. Each block prefers the pack's image and falls back to the
bundled one, so a partial pack works.

Three things to know. Packs whose licences forbid redistribution, such as Sphax
PureBDCraft and Ashen 16x, can be used this way but must not be committed; the
`texturepack` directory is ignored by git for that reason. A raw pack will
supply greyscale grass and leaves, which look grey until they are tinted as
above, with that pack's own colour map if it ships one. And the override only
reaches the 3D materials, so the hotbar and inventory tiles keep showing the
bundled art.
