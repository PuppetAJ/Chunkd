import {
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
} from "../../lib/voxel/blockValue.ts";
import { getBlock } from "../../lib/voxel/blocks.ts";
import { PANE_BLOCK_IDS } from "../../lib/voxel/blockIds.ts";
import { HOTBAR_SLOTS, useWorldStore } from "../../lib/voxel/worldStore.ts";

/**
 * The nine block slots.
 *
 * Previously this was a single line of text reading "Selected: Dirt", derived
 * from a chain of if/else branches that duplicated the block list. It also
 * showed one fixed block per slot; there are far more blocks than slots now, so
 * it shows whatever the inventory has put in each one.
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

/** What to add to a block's name for the shape the slot is set to. */
function shapeSuffix(shape: number): string {
  if (shape === SHAPE_SLAB_BOTTOM) return " Slab";
  if (shape === SHAPE_STAIRS_BOTTOM) return " Stairs";
  if (shape === SHAPE_FENCE) return " Fence";
  if (shape === SHAPE_WALL) return " Wall";
  if (shape === SHAPE_TRAPDOOR) return " Trapdoor";
  return "";
}

export default function Hotbar() {
  const selectedSlot = useWorldStore((state) => state.selectedSlot);
  const setSelectedSlot = useWorldStore((state) => state.setSelectedSlot);
  const hotbar = useWorldStore((state) => state.hotbar);
  const hotbarShape = useWorldStore((state) => state.hotbarShape);

  const selectedBlock = getBlock(hotbar[selectedSlot - 1] ?? 0);
  const selectedShape = hotbarShape[selectedSlot - 1] ?? SHAPE_FULL;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
      {selectedBlock && (
        <p className="rounded bg-black/60 px-3 py-1 text-sm text-white">
          {selectedBlock.label}
          {shapeSuffix(selectedShape)}
        </p>
      )}

      <ul className="pointer-events-auto flex gap-1 rounded-lg border-2 border-black/70 bg-zinc-900/80 p-2 shadow-lg">
        {Array.from({ length: HOTBAR_SLOTS }, (_, index) => {
          const slot = index + 1;
          const block = getBlock(hotbar[index] ?? 0);
          const selected = slot === selectedSlot;
          const shape = hotbarShape[index] ?? SHAPE_FULL;
          const name = `${block?.label ?? "Empty"}${shapeSuffix(shape).toLowerCase()}`;
          return (
            <li key={slot}>
              <button
                type="button"
                onClick={() => setSelectedSlot(slot)}
                aria-pressed={selected}
                aria-label={`${name}, slot ${slot}`}
                title={`${name} (${slot})`}
                className={`relative block h-12 w-12 overflow-hidden rounded border-2 bg-zinc-800 transition-transform ${
                  selected ? "scale-110 border-white" : "border-black/60 hover:border-gray-400"
                }`}
              >
                {/* The tile shows the shape itself rather than a badge to be
                    learned: a slab is the bottom half, stairs are that plus a
                    quarter above it. */}
                {block && shape === SHAPE_FULL && !PANE_BLOCK_IDS.has(block.id) && (
                  <img
                    src={block.side}
                    alt=""
                    className="absolute inset-0 h-full w-full"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
                {block && (shape === SHAPE_SLAB_BOTTOM || shape === SHAPE_STAIRS_BOTTOM) && (
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
                )}
                {/* The same idea for the thin shapes: a fence is a post and
                    two rails, a wall a post over a lower band, and a trapdoor
                    is its own drawing. */}
                {block && shape === SHAPE_FENCE && (
                  <>
                    <Cropped src={block.side} inset="0 37.5% 0 37.5%" />
                    <Cropped src={block.side} inset="43.75% 0 37.5% 0" />
                    <Cropped src={block.side} inset="6.25% 0 75% 0" />
                  </>
                )}
                {/* The band sits far lower than a real wall's, whose sides are
                    only two sixteenths below the post. At true height the tile
                    was indistinguishable from the whole block. */}
                {block && shape === SHAPE_WALL && (
                  <>
                    <Cropped src={block.side} inset="0 25% 0 25%" />
                    <Cropped src={block.side} inset="37.5% 0 0 0" />
                  </>
                )}
                {block?.trapdoor && shape === SHAPE_TRAPDOOR && (
                  <Cropped src={block.trapdoor} inset="0" />
                )}
                {/* A pane uses the glass drawing, as its item does in Minecraft,
                    with its edge standing up through the middle so the tile is
                    not mistaken for a glass block. */}
                {block && PANE_BLOCK_IDS.has(block.id) && (
                  <>
                    <Cropped src={block.side} inset="0" />
                    <Cropped src={block.top} inset="0" />
                  </>
                )}
                <span className="absolute bottom-0 right-1 text-[10px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                  {slot}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
