<h2 align="center">CHUNK'D</h2>

<p align="center">
Build voxel worlds in your browser, save them, and share them with other people.
</p>

## What it is

A web app with two halves. The client is a React Three Fiber scene where you walk
around a generated landscape and place or break blocks, plus a small social feed
where builds get posted and discussed. The server is a GraphQL API over MongoDB
that stores accounts, posts, comments, friendships and saved worlds.

![A saved build shared on a post](./assets/preview.jpg)

## Stack

| Layer | Choice |
|---|---|
| Package manager | pnpm workspaces |
| Client | React 19, Vite, Tailwind CSS v4, React Router |
| 3D | three.js, React Three Fiber, drei, Rapier physics |
| Data | Apollo Client against a GraphQL API |
| Server | Express 5, Apollo Server 5, Mongoose, TypeScript run directly by Node |
| Database | MongoDB |

## Running it locally

You need Node 22 or newer and pnpm.

```sh
pnpm install
cp .env.example .env      # then edit it, see below
pnpm db:up                # starts MongoDB in a container
pnpm seed                 # optional: fills the database with example content
pnpm dev                  # client on :3000, API on :3001
```

Open http://localhost:3000.

### The database

`pnpm db:up` runs `docker compose up -d`, which starts MongoDB 7 in a container
and stores its data in a named volume, so the data survives restarts.
`pnpm db:down` stops the container and leaves the volume in place.

Any Docker-compatible engine works, not just Docker Desktop. OrbStack and Colima
both provide the same `docker` command. Start the engine before running `db:up`;
with OrbStack that is `orb start`.

If you would rather not run a container at all, nothing in the app requires one.
The server connects to whatever `MONGODB_URI` points at, so a MongoDB installed
through Homebrew or a hosted MongoDB Atlas cluster works just as well. In that
case skip `pnpm db:up` and set `MONGODB_URI` accordingly.

### Environment

`.env` at the repository root configures the server. Copy `.env.example` and fill
it in. The only value with no sensible default is `JWT_SECRET`, which signs login
tokens. Generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The server validates its environment at startup and refuses to boot if anything
required is missing, so a misconfigured deployment fails immediately rather than
running in a broken state.

### Seeded accounts

`pnpm seed` creates 25 users and 60 posts. Every seeded account uses the password
`chunkd-dev-password`, and each one's email address is its username followed by
`@chunkd.test`.

## Scripts

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the client and the API together |
| `pnpm build` | Builds the client for production |
| `pnpm start` | Runs the API, serving the built client in production mode |
| `pnpm seed` | Resets the database to example content |
| `pnpm typecheck` | Type-checks both packages |
| `pnpm test:e2e` | Drives a real browser through every route (needs `pnpm dev` running) |
| `pnpm db:up` / `pnpm db:down` | Starts and stops the MongoDB container |

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

Three things are worth knowing before the first deploy:

- `NODE_ENV` must be exactly `production`. Anything else and the server skips
  serving the client entirely, so every page returns 404 while `/graphql` keeps
  working. That combination is confusing to debug.
- `JWT_SECRET` shorter than 32 characters fails environment validation and the
  process exits during startup rather than serving with a weak key. This is
  deliberate, but it looks like a crash loop.
- The build needs devDependencies, because Vite lives there. Do not enable an
  install flag that skips them.

The server has no build step. Node runs its TypeScript sources directly, which is
why `.node-version` matters: it must stay at 22.18 or newer.

## Controls

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
| P | Save the current world |

A jump clears a little over one block, which leaves room to place a block under
your own feet and build upwards.

Holding either mouse button repeats the action about six times a second.

The hotbar holds nine blocks and there are far more than nine, so the inventory
is how you choose which nine. Picking a block there puts it into whichever slot
is currently selected.

Logs and hay bales have a grain and are placed along the face you build against,
so a log put on top of something stands upright while one put against a wall
lies down.

## Block textures

The blocks use [Faithful 32x](https://faithfulpack.net/faithful32x), under the
[Faithful licence](https://faithfulpack.net/license) (version 4), which permits
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
whose licences forbid redistribution, such as Sphax PureBDCraft and Ashen 16x:
they can be used locally this way but must never be committed.

## Layout

```
client/    React app. Vite, Tailwind, and the 3D editor.
server/    GraphQL API. TypeScript, run directly by Node with no build step.
e2e/       Browser smoke test covering every route.
```

## Credits

Originally built by Adrian Jimenez, Alexander Havers, Caleb Funderburk,
Austin Reed and Dane Cronin.

Block textures come from the Minecraft Sphax PureBDCraft
[texture pack](https://bdcraft.net/downloads/purebdcraft-minecraft/). The
starting point for the 3D editor was [this sandbox](https://codesandbox.io/s/vkgi6).

## License

MIT. See [LICENSE](LICENSE).
