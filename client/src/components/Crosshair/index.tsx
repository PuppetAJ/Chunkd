/** Marks the point the player is aiming at, which is where blocks are edited. */
export default function Crosshair() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2"
    >
      <div className="relative h-5 w-5">
        <span className="absolute left-1/2 top-0 h-5 w-0.5 -translate-x-1/2 bg-white/80 mix-blend-difference" />
        <span className="absolute top-1/2 left-0 h-0.5 w-5 -translate-y-1/2 bg-white/80 mix-blend-difference" />
      </div>
    </div>
  );
}
