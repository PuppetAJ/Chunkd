import { Link } from "react-router";
import { Compass } from "lucide-react";
import { Button } from "../components/ui/button.tsx";

export default function NoMatch() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <Compass className="mx-auto mb-4 size-8 text-muted-foreground" />
      <h1 className="font-display text-xl">Oops, we couldn&apos;t find that page.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be out of date, or the post may have been deleted.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to the feed</Link>
      </Button>
    </div>
  );
}
