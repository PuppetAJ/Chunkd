# Block textures

## Where they come from

Every texture in this folder comes from **Faithful 32x**, version 26.2:

- Pack: https://faithfulpack.net/faithful32x
- Licence: https://faithfulpack.net/license (Version 4, 31 July 2026)
- Downloaded from the Faithful team's Modrinth listing, project `w0TnApzs`.

The Faithful licence permits using, modifying and distributing their work in
"your own games or software", which is why these can live in the repository and
ship in a deploy. It asks for four things in return, all of which this project
does:

1. Clear credit in an obvious place. It is in the site footer on every page, and
   in the in-game controls panel, since the editor covers the footer.
2. A clearly visible link to https://faithfulpack.net/.
3. Honesty about exactly what is used: the block textures listed below, from
   Faithful 32x, and nothing else. No GUI, item, entity or particle art is used.
4. A link to the licence, which both credits above carry.

Note that the 26.2 pack download still bundles a stale `LICENSE.txt` from
version 3 (2023), whose permissions are narrower and predate the clause allowing
use in original games. Version 4 on the website is the current licence and is
what this project relies on.

## What was changed

59 of the 64 files are byte-for-byte copies of Faithful's, and can be checked by
hashing them against the pack's own `assets/minecraft/textures/block` folder.

Five are derived, because Minecraft stores them greyscale and colours them by
biome at runtime, which a single-biome world cannot do. They were multiplied by
Minecraft's own plains-biome colours:

| File | How it was made |
|---|---|
| `grass_block_top.png` | `grass_block_top` multiplied by `#91BD59` |
| `grass_block_side.png` | `grass_block_side` with `grass_block_side_overlay` multiplied by `#91BD59` composited over it |
| `oak_leaves.png` | `oak_leaves` multiplied by `#77AB2F` |
| `birch_leaves.png` | `birch_leaves` multiplied by `#80A755` |
| `spruce_leaves.png` | `spruce_leaves` multiplied by `#619961` |

`cherry_leaves.png` is not tinted, because Minecraft does not tint it either.

## Using a different texture pack

The file names here are Minecraft's own, so any Minecraft resource pack's
`assets/minecraft/textures/block` folder can stand in. Put the images in
`client/public/texturepack/` and set `VITE_TEXTURE_PACK=/texturepack` in
`client/.env.local`. Each block prefers the pack's image and falls back to the
bundled one, so a partial pack works.

Two things to know. Packs whose licences forbid redistribution, such as Sphax
PureBDCraft and Ashen 16x, can be used this way but must not be committed; the
`texturepack` directory is ignored by git for that reason. And a raw pack will
supply the greyscale grass and leaves described above, which will look grey
until they are tinted the same way.
