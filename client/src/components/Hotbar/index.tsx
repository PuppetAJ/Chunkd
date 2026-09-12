import {
  SHAPE_FENCE,
  SHAPE_FULL,
  SHAPE_SLAB_BOTTOM,
  SHAPE_STAIRS_BOTTOM,
  SHAPE_TRAPDOOR,
  SHAPE_WALL,
} from "../../lib/voxel/blockValue.ts";
import { getBlock } from "../../lib/voxel/blocks.ts";
import { HOTBAR_SLOTS, useWorldStore } from "../../lib/voxel/worldStore.ts";
import BlockIcon from "../BlockIcon/index.tsx";

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
  const brush = useWorldStore((state) => state.brush);

  const selectedBlock = getBlock(hotbar[selectedSlot - 1] ?? 0);
  const selectedShape = hotbarShape[selectedSlot - 1] ?? SHAPE_FULL;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {selectedBlock && (
          <p className="rounded bg-black/60 px-3 py-1 text-sm text-white">
            {selectedBlock.label}
            {shapeSuffix(selectedShape)}
          </p>
        )}
        {/* Only while it is doing something. At one cell the brush is the
            ordinary way of building and needs no label. */}
        {brush > 1 && (
          <p className="rounded bg-black/60 px-3 py-1 text-sm text-white tabular-nums">
            {brush} &times; {brush}
          </p>
        )}
      </div>

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
                {block && <BlockIcon block={block} shape={shape} />}
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
