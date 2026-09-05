import { BLOCKS, type BlockGroup, type BlockType } from "../../lib/voxel/blocks.ts";
import { useWorldStore } from "../../lib/voxel/worldStore.ts";

/**
 * Every block, grouped, for putting one into the selected hotbar slot.
 *
 * The hotbar holds nine blocks and there are far more than nine, so something
 * has to choose which nine. Picking a block here writes it into whichever slot
 * is currently selected, which is the same thing scrolling the hotbar and then
 * clicking a block does in the games this borrows from.
 */
const GROUP_ORDER: BlockGroup[] = ["Ground", "Stone", "Worked stone", "Wood", "Other"];

function groupsOf(blocks: readonly BlockType[]): [BlockGroup, BlockType[]][] {
  return GROUP_ORDER.map((group) => [group, blocks.filter((block) => block.group === group)]);
}

interface Props {
  onClose: () => void;
}

export default function Inventory({ onClose }: Props) {
  const selectedSlot = useWorldStore((state) => state.selectedSlot);
  const hotbar = useWorldStore((state) => state.hotbar);
  const setHotbarBlock = useWorldStore((state) => state.setHotbarBlock);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border-2 border-zinc-700 bg-zinc-900/95 p-6 shadow-2xl"
        // Clicking a block should not also count as clicking the backdrop.
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl text-white">Blocks</h2>
          <p className="text-xs text-gray-400">
            Choosing a block puts it in slot {selectedSlot}. Press E or Escape to close.
          </p>
        </div>

        {groupsOf(BLOCKS).map(([group, blocks]) => (
          <section key={group} className="mb-5">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-gray-400">{group}</h3>
            <ul className="flex flex-wrap gap-2">
              {blocks.map((block) => {
                const inHotbar = hotbar.includes(block.id);
                return (
                  <li key={block.id}>
                    <button
                      type="button"
                      onClick={() => setHotbarBlock(selectedSlot, block.id)}
                      title={block.label}
                      aria-label={block.label}
                      className={`relative block h-12 w-12 overflow-hidden rounded border-2 bg-zinc-800 transition-transform hover:scale-110 ${
                        inHotbar ? "border-emerald-400" : "border-black/60"
                      }`}
                    >
                      <img
                        src={block.side}
                        alt=""
                        className="absolute inset-0 h-full w-full"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
