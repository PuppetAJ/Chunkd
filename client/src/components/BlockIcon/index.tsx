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

function TexturePiece({ src, window: where, image }: { src: string; window: string; image: string }) {
  return (
    <span className={`absolute overflow-hidden ${where}`}>
      <img src={src} alt="" className={`absolute ${image}`} style={{ imageRendering: "pixelated" }} />
    </span>
  );
}

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
  shape?: number;
}

export default function BlockIcon({ block, shape = SHAPE_FULL }: Props) {
  if (PANE_BLOCK_IDS.has(block.id)) {
    return (
      <img
        src={block.side}
        alt=""
        className="absolute inset-[12.5%] h-3/4 w-3/4"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

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

  if (shape === SHAPE_FENCE) {
    return (
      <>
        <Cropped src={block.side} inset="0 37.5% 0 37.5%" />
        <Cropped src={block.side} inset="43.75% 0 37.5% 0" />
        <Cropped src={block.side} inset="6.25% 0 75% 0" />
      </>
    );
  }

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
