<h2 align="center">CHUNK'D</h2>

<p align="center">
Build voxel worlds in your browser, save them, and share them with other people.
</p>

## Description

A web app with two halves. The client is a React Three Fiber scene where you
walk around a generated landscape and place or break blocks, plus a social feed
where builds get posted and discussed. The server is a GraphQL API over MongoDB
that stores accounts, posts, comments, follows and saved worlds.

![A saved build, shared on a post and opened in 3D](./assets/preview.webp)

## Stack

| Layer | Choice |
|---|---|
| Package manager | pnpm workspaces |
| Client | React 19, Vite, Tailwind CSS v4, React Router |
| Interface | shadcn/ui on Radix primitives, Lucide icons |
| 3D | three.js, React Three Fiber, drei |
| Data | Apollo Client against a GraphQL API |
| Server | Express 5, Apollo Server 5, Mongoose, TypeScript run directly by Node |
| Database | MongoDB |
| Tooling | oxlint, Playwright, `node --test` |

Collision and terrain generation are written by hand rather than pulled from a
physics library. They live in `client/src/lib/voxel/` and are covered by tests.

## Installation

You need Node 22 or newer and pnpm.

```sh
pnpm install
cp .env.example .env      # then edit it, see below
pnpm db:up                # starts MongoDB in a container
pnpm seed                 # optional, fills the database with example content
pnpm dev                  # client on :3000, API on :3001
```

Open http://localhost:3000.

### The database

`pnpm db:up` runs `docker compose up -d`, which starts MongoDB 7 in a container
and stores its data in a named volume, so the data survives restarts.
`pnpm db:down` stops the container and leaves the volume in place.

Any Docker-compatible engine works, not just Docker Desktop. OrbStack and Colima
both provide the same `docker` command. Start the engine before running `db:up`.
With OrbStack that is `orb start`.

You do not have to run a container at all. The server connects to whatever
`MONGODB_URI` points at, so MongoDB installed through Homebrew or a hosted
MongoDB Atlas cluster works just as well. Skip `pnpm db:up` and set
`MONGODB_URI` to your own connection string.

### Environment

`.env` at the repository root configures the server. Copy `.env.example` and
fill it in. The only value with no sensible default is `JWT_SECRET`, which signs
login tokens. Generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The server validates its environment at startup and refuses to boot if anything
required is missing, so a misconfigured deployment fails immediately instead of
running in a broken state.

### Seeded accounts

`pnpm seed` creates 25 users and 60 posts. Every seeded account uses the
password `chunkd-dev-password`, and each one's email address is its username
followed by `@chunkd.test`.

## Scripts

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the client and the API together |
| `pnpm build` | Builds the client for production |
| `pnpm start` | Runs the API, serving the built client in production mode |
| `pnpm seed` | Resets the database to example content |
| `pnpm lint` | Lints the whole workspace with oxlint |
| `pnpm test` | Runs the unit tests |
| `pnpm typecheck` | Type-checks both packages |
| `pnpm test:e2e` | Drives a real browser through every route, needs `pnpm dev` running |
| `pnpm test:a11y` | Runs axe-core over every page and fails on any WCAG 2.1 A or AA violation, needs `pnpm dev` running |
| `pnpm test:prod` | Drives the critical path against a production build, see Deploying |
| `pnpm db:up` / `pnpm db:down` | Starts and stops the MongoDB container |
| `pnpm --filter server migrate:following` | One-off, renames the old `friends` field to `following` |

## Usage

There is a demo account on the login and signup pages, so the app can be tried
without signing up for anything. Everyone shares it, and it cannot change its
own username, email or password, because that would lock the next visitor out.
Everything else works: build a world, save it, post it, comment on other posts.

Sign up to create an account. Once you are logged in you can read the feed,
open a build in 3D, comment on a post, and follow other users. The editor is
where you make a build of your own. Press P to name and save the world you are
standing in, then attach it to a post to share it.

### Controls

The editor needs a keyboard and a mouse or trackpad. Movement is WASD, aiming
uses the mouse, and the hotbar is on the number keys, none of which has a touch
equivalent yet. On a phone or a tablet with no trackpad the editor is left out
of the menu and its page explains why instead of loading. The rest of the site
works on any device, including turning a saved build around with a finger.

| Input | Action |
|---|---|
| W A S D | Move |
| Space | Jump |
| Double-tap space | Toggle flight |
| Shift | Walk slowly, or descend while flying |
| Mouse | Look, once you click to capture the pointer |
| Left click | Break a block. Hold to keep breaking |
| Right click | Place a block. Hold to keep placing |
| 1 to 9 | Choose a hotbar slot |
| Scroll wheel | Move along the hotbar, wrapping at both ends |
| E | Open the block inventory |
| Shift and drag | Pan, when looking at a saved build |
| P | Name and save the current world |
| Esc | Release the mouse and pause |

The editor opens on a pause screen listing all of this. Clicking plays, Escape
comes back to it, and that screen is also where you leave the editor.

A jump clears a little over one block, so you can place a block under your own
feet and build upwards.

Holding either mouse button repeats the action about six times a second. On a
Mac trackpad this avoids the two-finger double tap that macOS reads as Smart
Zoom. If that gesture zooms the page, turn it off in System Settings, Trackpad,
Scroll & Zoom.

The hotbar holds nine blocks and there are far more than nine, so the inventory
is how you choose which nine. Picking a block there puts it into whichever slot
is currently selected.

Logs and hay bales have a grain and are placed along the face you build against.
A log put on top of something stands upright, and one put against a wall lies
down.

## How builds are saved

A saved build stores the world seed and the blocks you changed, not the world
itself. Loading one regenerates the terrain from the seed and reapplies your
changes on top. A save is therefore the size of what you did rather than the
size of the map, which is a few kilobytes instead of several hundred.

This makes terrain generation part of the save format. If `generateTerrain` ever
produces different output, every build saved before the change loads as a
different world, with no error to tell you. `format.test.ts` holds a hash of the
terrain for four fixed seeds to catch that. If it fails, either put the terrain
back the way it was, or raise `BUILD_FORMAT_VERSION` and keep the old generator
for old builds.

## Deploying

In production the API also serves the built client, so this deploys as one
service rather than a separate frontend and backend. `railway.json` pins the
build and start commands and points Railway's healthcheck at `/health`, so a
deploy does not depend on what the platform infers.

Add a MongoDB, either Railway's template or a MongoDB Atlas cluster, then set
these variables on the service:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | a reference to the database service, or an Atlas connection string |
| `JWT_SECRET` | a generated value of at least 32 characters |
| `CLIENT_ORIGIN` | the service's own public URL |

`PORT` is supplied by the platform and read automatically.

Check the production path locally before deploying. Development and production
differ in ways the ordinary test suite cannot see, so there is a suite for this:

```sh
pnpm build
NODE_ENV=production PORT=4000 pnpm start
pnpm test:prod                     # in another terminal
```

It signs up, builds and saves a world, posts it, opens the post in 3D and
comments, and fails on any console error. The same command checks a real
deployment:

```sh
BASE=https://your-app.up.railway.app pnpm test:prod
```

Four things catch people out on a first deploy.

`NODE_ENV` must be exactly `production`. Anything else and the server skips
serving the client, so every page returns 404 while `/graphql` keeps working.

A `JWT_SECRET` shorter than 32 characters fails validation and the process exits
during startup. That is deliberate, but it looks like a crash loop.

The build needs devDependencies, because Vite lives there. Do not enable an
install flag that skips them.

A Content-Security-Policy applies in production and not in development, so a
page can work locally and break once deployed. `pnpm test:prod` is what catches
that. If you add a library that loads WebAssembly or fetches from another
origin, expect to widen the policy in `server/src/server.ts`, and to think about
whether the dependency is worth it first.

The server has no build step. Node runs its TypeScript sources directly, which
is why `.node-version` matters. It must stay at 22.18 or newer.

## Block textures

The blocks use [Faithful 32x](https://faithfulpack.net/faithful32x), under the
[Faithful licence](https://faithfulpack.net/license) version 4, which permits
using and distributing their work in your own games provided you credit them
clearly and link back. That credit is in the site footer and in the in-game
controls panel. Full detail, including the five textures that are tinted copies
rather than exact ones, is in
[`client/src/assets/textures/CREDITS.md`](client/src/assets/textures/CREDITS.md).

Because the file names are Minecraft's own, any Minecraft resource pack can
stand in. Put its block images in `client/public/texturepack/` and add this to
`client/.env.local`:

```
VITE_TEXTURE_PACK=/texturepack
```

Each block prefers the pack's image and falls back to the bundled one, so a
partial pack works. That directory is ignored by git, which matters for packs
whose licences forbid redistribution, such as Sphax PureBDCraft and Ashen 16x.
They can be used locally this way but must never be committed.

## Layout

```
client/    React app. Vite, Tailwind, and the 3D editor.
server/    GraphQL API. TypeScript, run directly by Node with no build step.
e2e/       Browser smoke test covering every route, plus an accessibility audit.
```

## Styling

Every colour, radius and font on the site comes from tokens at the top of
`client/src/index.css`. Change a hex value in the `:root` block and the whole
site follows.

## Credits

Built and maintained by Adrian Jimenez. The 2026 rebuild is his work: the voxel
editor and its renderer, the save format, the GraphQL API and the interface.

The original 2022 version was a team project with Alexander Havers, Caleb
Funderburk, Austin Reed and Dane Cronin. None of that interface remains.

Block textures are [Faithful 32x](https://faithfulpack.net/faithful32x), used
under the [Faithful licence](https://faithfulpack.net/license), with the exact
files and any edits listed in
[client/src/assets/textures/CREDITS.md](client/src/assets/textures/CREDITS.md).
The 3D editor started from [this sandbox](https://codesandbox.io/s/vkgi6).

Not an official Minecraft product. Not approved by or associated with Mojang.

## License

MIT. See [LICENSE](LICENSE).
