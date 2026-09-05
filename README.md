<h2 align="center">CHUNK'D</h2>

<p align="center">
Build voxel worlds in your browser, save them, and share them with other people.
</p>

## What it is

A web app with two halves. The client is a React Three Fiber scene where you walk
around a generated landscape and place or break blocks, plus a small social feed
where builds get posted and discussed. The server is a GraphQL API over MongoDB
that stores accounts, posts, comments, friendships and saved worlds.

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

You need Node 22 or newer and pnpm. Docker is the easiest way to get MongoDB, but
any MongoDB reachable over the network works.

```sh
pnpm install
cp .env.example .env      # then edit it, see below
pnpm db:up                # starts MongoDB in Docker
pnpm seed                 # optional: fills the database with example content
pnpm dev                  # client on :3000, API on :3001
```

Open http://localhost:3000.

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

## Controls

| Input | Action |
|---|---|
| W A S D | Move |
| Space | Jump |
| Shift | Walk slowly |
| Mouse | Look, once you click to capture the pointer |
| Left click | Break the block you are looking at |
| Right click | Place the selected block |
| 1 to 9 | Choose a block type |
| P | Save the current world |

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
