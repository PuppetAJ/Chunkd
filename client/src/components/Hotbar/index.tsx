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
                    learned: a slab is a half-height strip, and stairs are that
                    strip with a half-width piece stacked on it. */}
                {block && (
                  <>
                    <img
                      src={block.side}
                      alt=""
                      className={
                        shape === SHAPE_FULL
                          ? "absolute inset-0 h-full w-full"
                          : "absolute inset-x-0 bottom-0 h-1/2 w-full"
                      }
                      style={{ imageRendering: "pixelated" }}
                    />
                    {shape === SHAPE_STAIRS_BOTTOM && (
                      <img
                        src={block.side}
                        alt=""
                        className="absolute bottom-1/2 left-1/2 h-1/2 w-1/2"
                        style={{ imageRendering: "pixelated" }}
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
