# Block textures

"16x16 Block Texture Set" by ARoachIFoundOnMyPillow, released into the public
domain under CC0 and downloaded from OpenGameArt:

https://opengameart.org/content/16x16-block-texture-set

CC0 asks for nothing in return, so this file is a record of where the art came
from rather than a licence obligation.

## Using a different texture pack

Packs such as Sphax PureBDCraft and Ashen 16x are free to download but their
licences forbid redistributing the files, edited or otherwise, so they cannot be
committed here or shipped in a deploy. To use one on your own machine, put its
block textures in `client/public/texturepack/` using the same file names as this
folder and set `VITE_TEXTURE_PACK=/texturepack` in `client/.env.local`. That
directory is ignored by git, so nothing licensed ends up in the repository.
