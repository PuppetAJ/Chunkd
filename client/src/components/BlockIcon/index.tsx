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

/** A block as a square tile, for the hotbar and the inventory. */

/**
 * Part of a texture shown through a window rather than scaled into it, so the
 * pixels stay square. The image gets 200% of whichever axis is half a tile.
 */
function TexturePiece({ src, window: where, image }: { src: string; window: string; image: string }) {
  return (
    <span className={`absolute overflow-hidden ${where}`}>
      <img src={src} alt="" className={`absolute ${image}`} style={{ imageRendering: "pixelated" }} />
    </span>
  );
}

/** The whole texture clipped to one rectangle of the tile. The inset is CSS order: top, right, bottom, left. */
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
  // A pane is its own block with the same glass texture, so it is drawn small, like a flat item.
  if (PANE_BLOCK_IDS.has(block.id)) {
    return (
      <img
        src={block.side}
        alt=""
        // h-3/4 w-3/4: an absolutely placed image otherwise keeps its own size.
        className="absolute inset-[12.5%] h-3/4 w-3/4"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

  // A slab is the bottom half; stairs are that plus a quarter above it.
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

  // A fence is a post and two rails, a wall a post over a lower band.
  if (shape === SHAPE_FENCE) {
    return (
      <>
        <Cropped src={block.side} inset="0 37.5% 0 37.5%" />
        <Cropped src={block.side} inset="43.75% 0 37.5% 0" />
        <Cropped src={block.side} inset="6.25% 0 75% 0" />
      </>
    );
  }

  // The band sits lower than a real wall's; at true height the tile looked like a whole block.
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
