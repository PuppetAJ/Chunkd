import { PANE_BLOCK_IDS } from "../../lib/voxel/blockIds.ts";
import {
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
} from "../../lib/voxel/blockValue.ts";
import type { BlockType } from "../../lib/voxel/blocks.ts";

/**
 * What a block looks like in a square tile, for the hotbar and the inventory.
 *
 * Both draw the same blocks, so both draw them from here. While the inventory
 * had a copy of its own, a glass pane filled its tile with plain glass there
 * and was drawn as a pane in the hotbar, so the same block looked like two
 * different things depending on where you saw it.
 */

/**
 * Part of a block's texture, shown through a window rather than squeezed into
 * it.
 *
 * Scaling the image down to the size of the shape warped it, which is what
 * made a slab look like squashed stone. Here the image stays the size of the
 * whole tile and the window crops it, so the pixels stay square. The image is
 * given 200% of whichever of the window's axes is half a tile, and anchored to
 * the edge that keeps the matching part of the texture in view.
 */
function TexturePiece({ src, window: where, image }: { src: string; window: string; image: string }) {
  return (
    <span className={`absolute overflow-hidden ${where}`}>
      <img src={src} alt="" className={`absolute ${image}`} style={{ imageRendering: "pixelated" }} />
    </span>
  );
}

/**
 * The whole texture, cropped to one rectangle of the tile. For shapes made of
 * several pieces, a stack of these masks the tile without scaling it, so the
 * pixels stay square. The inset is CSS order: top, right, bottom, left.
 */
function Cropped({ src, inset }: { src: string; inset: string }) {
  return (
    <img
      src={src}
      alt=""
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "pixelated", clipPath: `inset(${inset})` }}
    />
  );
}

interface Props {
  block: BlockType;
  /** Whole block unless the slot has been cycled to a cut shape. */
  shape?: number;
}

export default function BlockIcon({ block, shape = SHAPE_FULL }: Props) {
  // A pane is a block of its own rather than a shape, and its texture is the
  // same glass. Drawn small, the way the game draws a flat item beside a
  // block, so the tile is not mistaken for a glass block.
  if (PANE_BLOCK_IDS.has(block.id)) {
    return (
      <img
        src={block.side}
        alt=""
        // The size is spelled out because an absolutely placed image otherwise
        // keeps its own, sixteen pixels in a corner of the tile.
        className="absolute inset-[12.5%] h-3/4 w-3/4"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

  // The tile shows the shape itself rather than a badge to be learned: a slab
  // is the bottom half, stairs are that plus a quarter above it.
  if (shape === SHAPE_SLAB_BOTTOM || shape === SHAPE_STAIRS_BOTTOM) {
    return (
      <>
        <TexturePiece
          src={block.side}
          window="inset-x-0 bottom-0 h-1/2"
          image="bottom-0 left-0 h-[200%] w-full"
        />
        {shape === SHAPE_STAIRS_BOTTOM && (
          <TexturePiece
            src={block.side}
            window="right-0 top-0 h-1/2 w-1/2"
            image="right-0 top-0 h-[200%] w-[200%]"
          />
        )}
      </>
    );
  }

  // The same idea for the thin shapes: a fence is a post and two rails, a wall
  // a post over a lower band, and a trapdoor is its own drawing.
  if (shape === SHAPE_FENCE) {
    return (
      <>
        <Cropped src={block.side} inset="0 37.5% 0 37.5%" />
        <Cropped src={block.side} inset="43.75% 0 37.5% 0" />
        <Cropped src={block.side} inset="6.25% 0 75% 0" />
      </>
    );
  }

  // The band sits far lower than a real wall's, whose sides are only two
  // sixteenths below the post. At true height the tile was indistinguishable
  // from the whole block.
  if (shape === SHAPE_WALL) {
    return (
      <>
        <Cropped src={block.side} inset="0 25% 0 25%" />
        <Cropped src={block.side} inset="37.5% 0 0 0" />
      </>
    );
  }

  if (shape === SHAPE_TRAPDOOR && block.trapdoor) {
    return <Cropped src={block.trapdoor} inset="0" />;
  }

  if (shape !== SHAPE_FULL) return null;

  return (
    <img
      src={block.side}
      alt=""
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
