import { cn } from "cn";

import soul64 from "../assets/Soul_Campfire_64.webp";
import soul64Still from "../assets/Soul_Campfire_64_still.webp";
import soul96 from "../assets/Soul_Campfire_96.webp";
import soul96Still from "../assets/Soul_Campfire_96_still.webp";
import fire64 from "../assets/Campfire_64.webp";
import fire64Still from "../assets/Campfire_64_still.webp";
import fire96 from "../assets/Campfire_96.webp";
import fire96Still from "../assets/Campfire_96_still.webp";

/**
 * The campfire mark, which turns from soul fire to ordinary fire on hover. Both
 * images are stacked and cross-faded so neither is fetched on first hover, and
 * `group-hover` follows the whole wordmark link rather than the icon alone.
 */

// Two sizes rather than one, because the header draws the mark at 28px on every
// page and the auth pages draw it at 48px. A single 96px file meant the header
// downloaded three and a half times the image it painted.
type LogoSize = "sm" | "lg";

const ART: Record<LogoSize, { soul: Flames; fire: Flames }> = {
  sm: {
    soul: { animated: soul64, still: soul64Still },
    fire: { animated: fire64, still: fire64Still },
  },
  lg: {
    soul: { animated: soul96, still: soul96Still },
    fire: { animated: fire96, still: fire96Still },
  },
};

interface Flames {
  animated: string;
  still: string;
}

interface Props {
  /** "sm" for the 28px header mark, "lg" for the 48px one on the auth pages. */
  size: LogoSize;
  /** Must set the drawn size, for example "size-7". Both flames fill it. */
  className?: string;
}

export default function CampfireLogo({ size, className }: Props) {
  const art = ART[size];
  return (
    <span className={cn("relative inline-block shrink-0", className)} aria-hidden="true">
      <Flame
        flames={art.soul}
        className="transition-opacity duration-200 group-hover:opacity-0"
      />
      {/* The hover flame is never on screen until someone points at the brand,
          so it must not compete for bandwidth with the first paint. Low priority
          keeps it off the critical path while still fetching it up front, which
          is what makes the first hover instant. */}
      <Flame
        flames={art.fire}
        priority="low"
        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </span>
  );
}

/**
 * One flame, in the version that suits the viewer.
 *
 * A forty-frame loop running forever in the corner of every page is exactly
 * what "reduce motion" is for, and no amount of CSS can pause an animated WebP.
 * A `<picture>` can choose a different file entirely, so someone with that
 * preference gets a single frame instead.
 */
function Flame({
  flames,
  className,
  priority = "auto",
}: {
  flames: Flames;
  className: string;
  priority?: "auto" | "low";
}) {
  return (
    <picture>
      <source srcSet={flames.still} media="(prefers-reduced-motion: reduce)" />
      <img
        src={flames.animated}
        alt=""
        decoding="async"
        fetchPriority={priority}
        className={cn("absolute inset-0 h-full w-full", className)}
      />
    </picture>
  );
}
