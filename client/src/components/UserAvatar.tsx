import { cn } from "cn";

/**
 * A stand-in avatar built from the username.
 *
 * Nobody uploads a picture, so the alternative is the same grey circle for
 * everyone. Hashing the name into a hue gives each person a consistent colour
 * across the feed, their profile and the follow lists without storing anything.
 */

// "sm" | "md" | "lg" rather than a number, so every avatar on the site is one
// of three sizes and they line up with each other.
type AvatarSize = "sm" | "md" | "lg";

interface Props {
  username: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-16 text-2xl",
};

function hueFor(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) % 360;
  }
  return hash;
}

export default function UserAvatar({ username, size = "md", className }: Props) {
  const name = username || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[#17161a] select-none",
        SIZE_CLASSES[size],
        className,
      )}
      // Saturation and lightness are fixed so the near-black initial always has
      // enough contrast, whatever hue the name lands on.
      style={{ backgroundColor: `hsl(${hueFor(name)} 45% 68%)` }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
