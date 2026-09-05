import { BLOCKS } from "../../lib/voxel/blocks.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";

/**
 * The nine block slots.
 *
 * Previously this was a single line of text reading "Selected: Dirt", derived
 * from a chain of if/else branches that duplicated the block list.
 */
export default function Hotbar() {
  const selectedSlot = useWorldStore((state) => state.selectedSlot);
  const setSelectedSlot = useWorldStore((state) => state.setSelectedSlot);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      <ul className="pointer-events-auto flex gap-1 rounded-lg border-2 border-black/70 bg-zinc-900/80 p-2 shadow-lg">
        {BLOCKS.map((block, index) => {
          const slot = index + 1;
          const selected = slot === selectedSlot;
          return (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => setSelectedSlot(slot)}
                aria-pressed={selected}
                aria-label={`${block.label}, slot ${slot}`}
                title={`${block.label} (${slot})`}
                className={`relative block h-12 w-12 rounded border-2 transition-transform ${
                  selected
                    ? "scale-110 border-white"
                    : "border-black/60 hover:border-gray-400"
                }`}
                style={{ backgroundColor: block.tint }}
              >
                <img
                  src={block.textureUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full mix-blend-overlay"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="absolute bottom-0 right-1 text-[10px] text-white/80">
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
