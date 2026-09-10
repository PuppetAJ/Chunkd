import { SHAPE_FULL, SHAPE_SLAB_BOTTOM, SHAPE_STAIRS_BOTTOM } from "../../lib/voxel/blockValue.ts";
import { getBlock } from "../../lib/voxel/blocks.ts";
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

/** What to add to a block's name for the shape the slot is set to. */
function shapeSuffix(shape: number): string {
  if (shape === SHAPE_SLAB_BOTTOM) return " Slab";
  if (shape === SHAPE_STAIRS_BOTTOM) return " Stairs";
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
                {block && shape === SHAPE_FULL && (
                  <img
                    src={block.side}
                    alt=""
                    className="absolute inset-0 h-full w-full"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
                {block && shape !== SHAPE_FULL && (
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
