// The API used to send pre-formatted date strings, which meant the server chose
// the format and the viewer's locale and time zone were ignored. It now sends
// ISO 8601 and this decides how to show it.

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const absolute = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/** "3 minutes ago" for anything recent, an absolute date beyond a week. */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const secondsAgo = Math.round((Date.now() - then) / 1000);

  if (secondsAgo < MINUTE) return "just now";
  if (secondsAgo < HOUR) return relative.format(-Math.floor(secondsAgo / MINUTE), "minute");
  if (secondsAgo < DAY) return relative.format(-Math.floor(secondsAgo / HOUR), "hour");
  if (secondsAgo < DAY * 7) return relative.format(-Math.floor(secondsAgo / DAY), "day");

  return absolute.format(then);
}
