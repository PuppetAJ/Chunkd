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
2. ShareAlike on anything adapted. The four tinted files below are adaptations
   and are offered under the same CC BY-SA 4.0 licence. The other 61 are
   unchanged copies, and the rest of this repository stays MIT: bundling images
   in an application is a collection rather than an adaptation of the images,
   which the licence treats separately.

## What was changed

61 of the 65 files are byte-for-byte copies and can be checked by hashing them
against the packs above.

Four are derived:

| File | How it was made |
|---|---|
| `grass_block_top.png` | tinted with the pack's plains grass colour, `#6DC475` |
| `grass_block_side.png` | the pack's own side, with `grass_block_side_overlay` tinted `#6DC475` composited over it |
| `oak_leaves.png` | tinted with the pack's plains foliage colour, `#5BB155` |
| `grass_block_snow.png` | only the green of the snow edge, tinted `#6DC475` |

The first three exist because Minecraft stores those textures greyscale and
colours them by biome at runtime, which a single-biome world cannot do. Birch,
spruce and cherry leaves are copied through untouched: this pack paints them in
their final colours, birch as golden autumn leaves rather than green, so
tinting them would undo the artwork.

The two colours come from the pack's own `colormap/grass.png` and
`colormap/foliage.png`, read at the coordinate Minecraft looks up for plains,
which is temperature 0.8 and downfall 0.4. Pixel Perfection replaces those
colour maps, so the game renders it in greens of the pack's choosing rather
than Minecraft's defaults. Its plains grass is `#6DC475` against Minecraft's
`#91BD59`, a good deal less red, and using Minecraft's number left the grass
olive and wrong beside the pack's own artwork.

Tinting is three steps rather than the straight multiply the game does:

1. Take the texture's luminance, which drops any colour cast it carries.
2. Raise it to the power 0.7 and scale the result so its average is 0.58, the
   level Minecraft's own greyscale sits at.
3. Multiply by the colour.

The power is what separates this from the game's own tint. The renderer's
filmic curve is hard on dark pixels, and the darkest pixels of the grass came
out of it looking like dirt in the grass rather than shading. Raising the dark
end without moving the average keeps the colour where it is and stops the
speckles reading as grime. Measured on screen, the darkest tenth of the grass
edge went from a luminance of 23 to 32, and the snowy grass edge from 13 to 27,
with the average unchanged.

`grass_block_snow.png` is the odd one out. Minecraft does not tint it at all,
and the pack paints its grass edge several shades darker than the tint
produces, which beside a normal grass block read as a black line under the
snow. Only the green pixels of it are redone, so its snow and its dirt are
still the pack's own.

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
