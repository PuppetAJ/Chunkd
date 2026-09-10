import { Suspense, lazy } from "react";
import { Link } from "react-router";
import { useQuery } from "@apollo/client/react";
import { Blocks, Play, Share2, Save } from "lucide-react";

import { QUERY_THOUGHTS } from "../utils/queries.ts";
import { useDemoLogin } from "../lib/useDemoLogin.ts";
import { DEMO_USERNAME, type Thought } from "../lib/feedTypes.ts";
import { Button } from "../components/ui/button.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";

// The viewer drags in three.js, which is larger than the rest of the page put
// together. Loading it separately means the landing page paints, and shows the
// build's own thumbnail, before any of that arrives.
const SavedBuild = lazy(() => import("../components/SavedBuild/index.tsx"));

/** How many recent posts to look through for something to show. */
const LOOK_AT = 12;

/**
 * What a signed-out visitor sees at the root.
 *
 * The feed used to be the front door, which is the wrong way round for
 * something nobody has an account for yet. A feed is also the one page that
 * cannot look finished until other people have filled it, whereas this can.
 */
export default function Landing() {
  const { startDemo, loading: startingDemo, error } = useDemoLogin();
  const { loading, data } = useQuery(QUERY_THOUGHTS, {
    variables: { limit: LOOK_AT, offset: 0 },
  });

  const thoughts: Thought[] =
    (data as { thoughts?: Thought[] } | undefined)?.thoughts ?? [];
  // Anyone can post as the demo account, and this page carries the site's
  // name. Only builds from real (seeded or signed-up) accounts appear here;
  // demo posts still show in the feed, behind a sign-in, where they are
  // clearly a sandbox.
  const withBuilds = thoughts.filter(
    (thought) => thought.build?.thumbnail && thought.username !== DEMO_USERNAME,
  );
  const hero = withBuilds[0] ?? null;
  const gallery = withBuilds.slice(1, 7);

  // The hero splits in two at lg rather than md. Measured, a half column below
  // 1024 is under 360px, which is not enough for the two buttons to sit side by
  // side or for a sentence of the small print to stay on one line, so the split
  // there costs more than it gains. Below it the page narrows to a reading
  // column instead, and the spare width sits evenly on both sides.
  return (
    <div className="mx-auto max-w-2xl space-y-16 pb-8 lg:max-w-none">
      <section className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-2 lg:items-stretch lg:gap-x-14">
        <div>
          {/* The lines are split by hand because the wordmark font reads
              better broken at the phrase. Below sm there is not enough width to
              honour that, so the spans go back to being inline and the text
              wraps wherever it fits. */}
          <h1 className="font-display text-4xl leading-tight sm:text-5xl md:text-6xl lg:text-5xl">
            <span className="sm:block">Build a world</span>{" "}
            <span className="sm:block">in your browser</span>
          </h1>
          <p className="mt-4 text-muted-foreground sm:text-lg md:text-xl lg:max-w-md lg:text-base">
            Place blocks, break blocks, and fly around a landscape that is
            generated fresh every time. Save what you make and post it for other
            people to walk through in 3D.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={startDemo} disabled={startingDemo}>
              <Play />
              {startingDemo
                ? "Opening the demo..."
                : "Try it without an account"}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">Create an account</Link>
            </Button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground opacity-60 sm:text-sm lg:col-start-1 lg:row-start-2 lg:text-xs">
          <span className="sm:block">
            *The demo is a shared account, so anything you make in it is public.
          </span>{" "}
          <span className="sm:block">
            This is a portfolio site: everything resets every few hours.
          </span>
        </p>

        {/* Stacked, the viewer sets its own height from its width. Side by
            side it drops the ratio and takes both rows of the right hand
            column, so it is exactly as tall as everything stacked up on the
            left, disclaimer included.

            min-h-0 and the absolute layer below are what stop a canvas that has
            not been resized yet from feeding its old height back into the rows
            it spans. Without them, dragging the window wider makes the text
            reflow shorter while the canvas is still tall, the grid grows the
            rows to fit it, the renderer then measures that taller box, and the
            gap it opens under the buttons stays until the page is reloaded. */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-border bg-card lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:aspect-auto lg:min-h-0">
          <div className="absolute inset-0">
            {loading && !hero && <Skeleton className="h-full w-full" />}
            {hero?.build && (
              <Suspense
                fallback={
                  <img
                    src={hero.build.thumbnail ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                }
              >
                <SavedBuild buildId={hero.build._id} autoRotate />
              </Suspense>
            )}
          </div>
        </div>

      </section>

      {gallery.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Made in CHUNK&apos;D</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open any of them to walk around it in 3D.
          </p>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((thought) => (
              <li key={thought._id}>
                <Link
                  to={`/thought/${thought._id}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <img
                    src={thought.build?.thumbnail ?? ""}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="truncate font-medium">
                      {thought.build?.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      by {thought.username}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl">How it works</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Blocks className="size-5" />,
              title: "Build",
              body: "A new landscape every time, with a hotbar of blocks and no download.",
            },
            {
              icon: <Save className="size-5" />,
              title: "Save",
              body: "Worlds are stored as a seed and the blocks you changed, so a save is a few kilobytes.",
            },
            {
              icon: <Share2 className="size-5" />,
              title: "Share",
              body: "Post a build and anyone can open it, turn it around and comment on it.",
            },
          ].map((step) => (
            <li
              key={step.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {step.icon}
              </div>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
