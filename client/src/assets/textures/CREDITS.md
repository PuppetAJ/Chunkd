# Block textures

## What is in this folder

Every file here is from "16x16 Block Texture Set" by ARoachIFoundOnMyPillow,
released into the public domain under CC0 and downloaded from OpenGameArt:

https://opengameart.org/content/16x16-block-texture-set

CC0 asks for nothing in return, so this section is a record of where the art came
from rather than a licence obligation. Every file is unmodified: none of it was
drawn or generated for this project, and it can be checked by hashing these files
against the pack's own `blocks.zip`.

Some of the file names are the pack author's own and look like placeholders,
`sand_ugly.png` in particular. They are kept as they came so that the comparison
above stays easy to make.

## Using Ashen 16x, or another pack

Ashen 16x is the pack this project is meant to look best with:

https://www.curseforge.com/minecraft/texture-packs/ashen-16x

It is **not** included here, and neither is Sphax PureBDCraft. Both are free to
download, but both are All Rights Reserved and their authors forbid
redistributing the files, edited or otherwise, so committing them or shipping
them in a deploy would not be allowed. Ashen's terms do permit modifying the
files for personal use, which is what the override below is for.

To use one on your own machine:

1. Download the pack from the link above.
2. Put its block images in `client/public/texturepack/`, named to match the files
   in this folder (`grass_top.png`, `oak_log_side.png`, and so on).
3. Add this line to `client/.env.local`:

   ```
   VITE_TEXTURE_PACK=/texturepack
   ```

Each block prefers the pack's image and falls back to the bundled one for
anything the pack does not supply, so a partial pack works fine. That directory
is ignored by git, so nothing licensed ends up in the repository.
