import { cn } from "cn";

import soul64 from "../assets/Soul_Campfire_64.webp";
import soul64Still from "../assets/Soul_Campfire_64_still.webp";
import soul96 from "../assets/Soul_Campfire_96.webp";
import soul96Still from "../assets/Soul_Campfire_96_still.webp";
import fire64 from "../assets/Campfire_64.webp";
import fire64Still from "../assets/Campfire_64_still.webp";
import fire96 from "../assets/Campfire_96.webp";
import fire96Still from "../assets/Campfire_96_still.webp";

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
  size: LogoSize;
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
      <Flame
        flames={art.fire}
        priority="low"
        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
    </span>
  );
}

/**
 * One flame. Reduced motion gets a single frame through the <picture>, since
 * CSS cannot pause an animated WebP.
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
