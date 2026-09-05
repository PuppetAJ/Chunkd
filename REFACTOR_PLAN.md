# CHUNK'D (ReactMC) — Refactor & Modernization Plan

Goals, in priority order as stated:

1. Increase performance (mainly the 3D editor, secondarily page load / data fetching)
2. Update to latest technologies
3. Improve / modernize aesthetics
4. Make sure the entire project is functional
5. Migrate to pnpm

The plan is ordered so each phase leaves the app in a runnable state. Do them as separate branches / PRs in the order below; the ordering matters because later phases depend on tooling from earlier ones (pnpm workspaces → Vite → TypeScript → editor rewrite).

---

## Status

| Phase | State |
|---|---|
| 0 Baseline and safety net | Done, folded into phase 1 |
| 1 pnpm workspaces | Done |
| 2 Server modernization | Done |
| 3 Client toolchain (Vite, React 19, Tailwind 4) | Done |
| 4 Editor performance rewrite | Done |
| 5 Functionality fixes | Next; much of it already done as a side effect of phases 2 to 4 |
| 6 UI and aesthetics | Not started |
| 7 Quality, tests, deployment | Partly done: CI and an end-to-end suite exist |

**Deviation from the original ordering.** Phase 1 planned to install the existing
Create React App setup under pnpm before replacing it. That step was skipped.
Create React App is deprecated and interacts poorly with pnpm's strict linking,
so debugging a toolchain that was about to be deleted would have been wasted
work. The client went straight to Vite instead. Phase 0's baseline walk was also
folded into phase 1, replaced by the browser-driven suite in `e2e/smoke.mjs`,
which is a better record of what works than a hand-written document.

**Old commit tagged `v1-legacy`** if you ever need the original code.

### Decision taken in phase 4

The physics engine was removed rather than batched. The scene has exactly one
dynamic body, the player, and every other object is a static unit cube on an
integer grid, so none of a rigid body engine's generality was being used while it
cost 1.9 MB and a WebAssembly instantiation on every editor visit. Collision is
now an axis-by-axis resolve of the player's box against the block map, which is
what voxel games normally do.

### Known issues carried forward

- Editor frame rate on real hardware has not been measured. The numbers recorded
  below come from a headless browser using software rasterisation, so they are
  useful for comparing before against after but are not representative of a real
  GPU.
- `PointerLockControls` cannot be exercised headlessly, so mouse-look is the one
  interaction the end-to-end suite does not cover.
- The site header and footer still render on the editor route, so the hotbar sits
  on top of the footer. Phase 6 replaces the page shell.
- Builds are all named "Untitled build". Naming them belongs with the save
  dialog in phase 6.

---

---

## 0. Where the project is today (audit, Sept 2026)

Last commit: December 2022. Nothing has been touched since. Local toolchain: Node 24, npm 11, pnpm 11.2, corepack 0.34.

### Structure

```
/                 bare package.json (concurrently only) + package-lock.json
/client           Create React App 5, React 18.2, Tailwind 3.2, R3F 8 / drei 9 / three 0.147 / rapier 0.11
/server           Express 4, apollo-server-express 3, Mongoose 5.9, jsonwebtoken 8, bcrypt 5
```

Three separate `package-lock.json` files, a root `install` script that `cd`s into each folder, no `.env`, no CI, no tests (Testing Library is installed but unused), deployed to the now-dead Heroku free tier.

### Dependencies that are end-of-life or have breaking upgrades

| Package | Now | Status |
|---|---|---|
| `react-scripts` (CRA) | 5.0.1 | Deprecated by React team; no updates since 2022 |
| `apollo-server-express` | 3.x | End of life Oct 2023; replaced by `@apollo/server` |
| `mongoose` | 5.9 | Very old. `useNewUrlParser`/`useFindAndModify` options throw in v6+; `doc.delete()` removed in v7; seed script uses `insertMany(...).ops`, removed in driver v4 |
| `faker` | 4.1 | Abandoned/sabotaged package; use `@faker-js/faker` |
| `jsonwebtoken` | 8.x | Security fixes only in 9.x |
| `zustand` | 4.1 | Default `import create from "zustand"` removed in v5 |
| `jwt-decode` | 3.x | v4 switched to named export `{ jwtDecode }` |
| `@react-three/drei` | 9.46 | `softShadows()` removed; now `<SoftShadows />` component |
| `@react-three/rapier` | 0.11 | v1+ removed `world.raw()`; Rapier renamed `ray.toi` → `timeOfImpact` |
| `@react-three/fiber` | 8.x | v9 is required for React 19 |
| `tailwindcss` | 3.2 | v4 is CSS-first config, Vite plugin, no `tailwind.config.js` |
| `react-router-dom` | 6.4 | v7 (`react-router` single package, library mode) |
| `nodemon` | 2.x | Replace with `node --watch` / `tsx watch` |
| workbox (12 packages) | 6.5 | Service worker is registered in `index.js`; it is a liability, not a feature (stale caches after deploys) |
| `leva` | 0.9 | Imported in Editor/SavedBuild only as dead import |
| `nanoid`, `web-vitals` | – | Installed, never imported |

### Performance problems found in the editor (`client/src/Components/{Terrain,Cube,Player}`)

- **One `<CuboidCollider>` React component per terrain block** (~1,100–2,000 blocks: 32×32 top layer + hollow walls + floor). Every add/remove of a block calls `setBlocks` and re-renders all of them.
- **One `<Instance>` React child per terrain block**, each with its own `onClick` prop, all re-rendered on every state change.
- **Player-placed cubes are each a `RigidBody` + mesh + 6 `transparent` materials**, keyed by array index (so removing one remounts every cube after it), and each `Cube` calls `useTexture` nine times.
- **Raycast every frame against `scene.children`** (recursive, hits every instance) in `Player`'s `useFrame`, then mutates instance colors directly for the highlight.
- **`setState` inside `useFrame`**: `setSelected` fires every frame while a hotbar key is held; `setSaveButton` toggles every frame.
- `softShadows()` is called on every render of `Editor`; a shadow-casting point light over the whole scene is the most expensive shadow setup possible.
- `gl={{ preserveDrawingBuffer: true }}` disables buffer swapping optimizations and is only there for screenshots (which don't exist yet).
- **Save format**: full JSON dump of every terrain position and every cube (`{cubes, instanceBlocks}`), stored as a string inside an untyped `savedBuilds: []` array on `User`. This is why the server has `express.json({ limit: "50mb" })`, and why `QUERY_ME` (used by Editor and Profile) drags every build blob down on every page load.
- No route-level code splitting: three + rapier WASM + drei ship to the login page.

### Functional bugs found

- `Editor.js`: `<Navigate to="/Editor" />` (capital E, route is `/editor`), and the whole `userParam` check is copied from `Profile` and makes no sense there.
- `PostModal`: `<Navigate to="/test" />` (route doesn't exist).
- `PostModal`: `{user.savedBuilds.length && (...)}` renders a literal `0` when the user has no builds.
- `index.css`: `@font-face` `src: url(/src//assets/mc-font.otf)` is a broken path in production.
- `Player`: `objMem` / `saveMem` are module-level globals, so state leaks between Editor mounts.
- `Terrain`/`Cube`: use deprecated `window.event.button` instead of the R3F event.
- `Cube`: mutates shared texture objects (`magFilter`) on every render; only dirt/grass get `NearestFilter`.
- `Auth.login/logout` do `window.location.assign("/")` (full reload, drops Apollo cache and router state).
- `Hotbar`/`SaveModal` receive a `setModalOn` prop nobody passes; `Player` drives the save toast by `document.querySelector(".save-modal")` class toggling.
- `deleteFriend` exists only as commented-out code (resolver, typedef, mutation). No `deleteBuild`, no edit/delete for reactions.
- `server/utils/auth.js`: **JWT secret is hard-coded** (`mysecretshhhhh`). No `.env` anywhere.
- `server/server.js`: static `client/build` is served in all environments; catch-all only in production; no CORS/helmet/compression.
- `seeders/seeds.js` will crash on any modern Mongo driver (`.ops`).
- README still points at Heroku.

---

## 1. Target stack

| Layer | Choice | Why |
|---|---|---|
| Package manager | **pnpm workspaces** (`client`, `server`, `packages/shared`) | Stated goal; also removes the `cd && npm i` install hack |
| Node | 22 LTS minimum, pinned via `engines` + `.node-version` | Enables `node --watch`, `--env-file`, native `fetch` |
| Language | **TypeScript** everywhere, migrated incrementally (`allowJs: true`) | Catches the class of bugs listed above; needed for shared build-format types |
| Client build | **Vite** + `@vitejs/plugin-react` | CRA replacement; dev proxy replaces CRA `proxy` field |
| UI | **React 19**, **react-router 7** (library mode) | Minimal API drift from RRD 6 |
| Styling | **Tailwind v4** (`@import "tailwindcss"`, `@theme` tokens, `@tailwindcss/vite`) | Drop `tailwind.config.js` / postcss config |
| 3D | **R3F 9**, **drei 10**, **three** latest, **@react-three/rapier 2.x**, **zustand 5** | React 19 support; perf work is built on these APIs |
| Data | Keep **GraphQL**. **Apollo Client** latest 3.x during migration → 4.x as a follow-up | Schema is small and fine; no reason to rewrite to REST |
| Server | **Express 5** + **@apollo/server 5** (`expressMiddleware` via `@as-integrations/express5`) + **Mongoose 8** | Direct successors of the current stack |
| Auth | `jsonwebtoken` 9, secret from env, **`bcryptjs`** instead of `bcrypt` | bcryptjs has no native build step, which pnpm 10+ blocks by default |
| Validation | **zod** (shared schemas for build format + GraphQL input) | Also used for `.env` parsing |
| Lint/format | **ESLint 9 flat config** + **Prettier** (or Biome if you prefer one tool) | |
| Tests | **Vitest** + Testing Library (client), Vitest + `mongodb-memory-server` (server), **Playwright** smoke test | |
| Local DB | `docker-compose.yml` with `mongo:7` | |
| CI | GitHub Actions: install → lint → typecheck → test → build | |
| Hosting | Render / Fly.io / Railway + MongoDB Atlas | Heroku free tier is gone |

---

## 2. Phases

### Phase 0 — Baseline and safety net — DONE (folded into phase 1)

Goal: know exactly what works before touching anything.

- [ ] Create branch `refactor/baseline`. Tag current `main` as `v1-legacy`.
- [ ] Add `docker-compose.yml` (Mongo 7) and get the app running as-is on Node 24. Expect Mongoose 5.9 issues; if it won't connect, pin Node 18 via `.node-version` temporarily just for this step.
- [ ] Walk every route and record what works / what's broken in `docs/BASELINE.md` (sign up, login, post, comment, add friend, editor place/break/save, view saved build on profile, single thought page, 404).
- [ ] Record baseline numbers: production JS bundle size per route, editor FPS with drei `<Stats />` after placing ~300 blocks, time-to-interactive on `/`. These are the "before" for the perf goal.
- [ ] Take screenshots of every page for the aesthetics before/after.
- [ ] Add `.env.example` for both packages; move JWT secret + Mongo URI to env immediately (this is a security fix, do it now even though the "real" server work is Phase 2).

**Done when:** app boots locally from a clean clone using documented steps, and `docs/BASELINE.md` exists.

### Phase 1 — Migrate to pnpm workspaces — DONE

Goal: pnpm is the foundation everything else builds on, and the migration is safest while the code is unchanged.

- [ ] Delete all three `package-lock.json` files and all `node_modules`.
- [ ] Add `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - client
    - server
    - packages/*
  ```
- [ ] Root `package.json`: `"packageManager": "pnpm@<current>"`, `"engines": { "node": ">=22" }`, `"private": true`, and replace the `cd`-based scripts:
  ```json
  "dev":   "pnpm -r --parallel --stream dev",
  "build": "pnpm --filter client build",
  "start": "pnpm --filter server start",
  "lint":  "pnpm -r lint",
  "test":  "pnpm -r test",
  "typecheck": "pnpm -r typecheck"
  ```
  Drop `concurrently`; pnpm's `--parallel` replaces it. Rename `server`'s `watch` script to `dev` and `client`'s `start` to `dev` so `-r dev` works.
- [ ] `.npmrc`: `save-exact=true`, and since pnpm 10+ refuses to run postinstall scripts of dependencies unless allow-listed, add to root `package.json`:
  ```json
  "pnpm": { "onlyBuiltDependencies": ["bcrypt"] }
  ```
  (goes away once `bcrypt` → `bcryptjs` in Phase 2).
- [ ] Prune dead deps now, no code changes needed: `leva` (dead import, remove the import line too), `nanoid`, `web-vitals`, all 12 `workbox-*` packages + `service-worker.js` + `serviceWorkerRegistration.js` + the `register()` call, `@testing-library/*` (re-added properly in Phase 7), `@types/three` from `dependencies` (comes back as a devDependency with TS).
- [ ] `pnpm install`, commit `pnpm-lock.yaml`, update `.gitignore` (`node_modules`, `dist`, `build`, `.env*` except `.env.example`).
- [ ] Add `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile && pnpm build`. It only builds for now; lint/test are added to it in later phases.
- [ ] Update README install/usage section.

**Done when:** `pnpm install && pnpm dev` works from a clean clone and CI is green on the build step.

### Phase 2 — Server modernization — DONE

Goal: modern, secure, testable API with an unchanged GraphQL contract (the client from Phase 1 must still work against it, so client and server can be upgraded independently).

- [ ] Convert `server` to TypeScript (`tsx watch src/server.ts` in dev, `tsc` → `dist/` for prod). ESM (`"type": "module"`).
- [ ] `express@5`, `@apollo/server@5` + `@as-integrations/express5`, `mongoose@8`, `jsonwebtoken@9`, `bcryptjs`, `@faker-js/faker`, `graphql@16`, `cors`, `helmet`, `compression`, `zod`, `dotenv` (or `node --env-file`).
- [ ] Rewrite `server.ts` around `expressMiddleware(server, { context })`. Remove `apollo-server-express` entirely. Throw `GraphQLError` with `extensions.code = "UNAUTHENTICATED"` instead of the removed `AuthenticationError`.
- [ ] Config module: parse env with zod at startup (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`). Fail fast with a readable message if missing.
- [ ] Mongoose 8: remove connection options, replace `thought.delete()` with `deleteOne()`, add `timestamps: true` instead of the manual `createdAt` + getter, and stop formatting dates on the server (return ISO strings, format on the client with `Intl.DateTimeFormat`). Add indexes on `username`, `email`, `Thought.username`, `Thought.createdAt`.
- [ ] **New `Build` model** (`{ owner, name, thumbnail?, format: 1, data, createdAt }`) replacing `User.savedBuilds: []`. `Thought.build` becomes an `ObjectId` ref to `Build`. This is the schema half of the save-format work in Phase 4; the data format itself is defined in `packages/shared`.
- [ ] GraphQL schema additions: `builds`/`build(id)` queries, `deleteBuild`, `deleteFriend`, `updateThought`, `deleteReaction`, `Build` type. Keep every existing field so the old client keeps working during the transition.
- [ ] Write a one-off migration script `server/scripts/migrate-builds.ts` that converts each string in `User.savedBuilds` into a `Build` document in the new compact format. Run it once against prod data before cutting over.
- [ ] Fix seeds for `@faker-js/faker` + Mongoose 8 (`User.create` in a loop so the password pre-save hook runs; today seeded users have plaintext passwords and can't log in).
- [ ] Hardening: `helmet`, `cors` locked to `CLIENT_ORIGIN`, `express.json({ limit: "1mb" })` (the 50mb limit exists only because of the save format), basic rate limit on `login`/`addUser` (`express-rate-limit`), unique-index error mapping to friendly messages, password min length 8.
- [ ] Tests: Vitest + `mongodb-memory-server` covering every resolver (auth required, owner-only delete, friend add/remove, build CRUD).
- [ ] Add `lint`, `typecheck`, `test` to CI.

**Done when:** `pnpm --filter server test` passes, the Phase 1 client works unchanged against the new server, and no secrets are in the repo.

### Phase 3 — Client build migration: CRA → Vite, React 19, Tailwind 4, TypeScript — DONE

Goal: modern toolchain with the *same* UI and behavior. No visual or feature changes in this phase, so regressions are easy to spot.

- [ ] `pnpm create vite` scaffold values into `client`: move `public/index.html` → `client/index.html` with `<script type="module" src="/src/main.tsx">`; delete `%PUBLIC_URL%` usages; `vite.config.ts` with `server.proxy: { "/graphql": "http://localhost:3001" }` replacing the CRA `proxy` field.
- [ ] `tsconfig.json` with `allowJs: true`, `strict: true`; rename files to `.tsx` as they are touched. Start with `utils/`, then pages, then editor (editor is fully typed in Phase 4 anyway).
- [ ] Upgrade: `react@19`, `react-dom@19`, `react-router@7` (`import { BrowserRouter, Routes, Route, Link, useParams, Navigate } from "react-router"`), `@apollo/client` latest 3.x, `jwt-decode@4` (`import { jwtDecode }`), `react-icons` latest, `zustand@5` (`import { create }`).
- [ ] Tailwind v4: remove `tailwind.config.js` + `postcss.config.js`, add `@tailwindcss/vite`, replace the three `@tailwind` directives with `@import "tailwindcss"`, move the `secondary` color into `@theme`. Fix the `@font-face` path (`/src/assets/mc-font.otf` → import the font from `src/assets` or serve from `public/fonts/`).
- [ ] Upgrade 3D stack to `@react-three/fiber@9`, `@react-three/drei@10`, `three` latest, `@react-three/rapier@2`, and fix the known API breaks just enough to run (real rewrite is Phase 4):
  - `softShadows()` → `<SoftShadows />` inside `<Canvas>` (or drop it).
  - `rapier.world.raw()` → `rapier.world`; `ray.toi` → `ray.timeOfImpact`.
  - `useTexture` results: set `texture.colorSpace = THREE.SRGBColorSpace`; `three` r152+ defaults changed and textures will look washed out otherwise.
  - `Instances`/`Instance` from drei still exist; `RigidBody`/`CuboidCollider`/`CapsuleCollider` still exist.
- [ ] Env: `REACT_APP_*` → `VITE_*` / `import.meta.env` (there are none today; note it for the deploy step).
- [ ] Route-level code splitting: `React.lazy` for `Editor`, `Profile` (because it renders `SavedBuild`), and `SingleThought`, wrapped in `<Suspense>`. Three + rapier must not be in the initial chunk. Verify with `vite build` output / `rollup-plugin-visualizer`.
- [ ] Replace `window.location.assign("/")` in `Auth` with `navigate("/")` + `client.resetStore()`; make `Auth` a small React context / zustand store so `Header` re-renders on login without a reload.
- [ ] ESLint 9 flat config (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) + Prettier. Fix or explicitly suppress every warning; `react-hooks/exhaustive-deps` will flag several real bugs in `Player` and `Terrain`.

**Done when:** `pnpm --filter client build` produces a Vite bundle, every page from `docs/BASELINE.md` behaves identically, and the initial-load JS for `/` is a fraction of the CRA bundle (target: under 200 KB gzipped).

### Phase 4 — Editor performance rewrite — DONE

Goal: 60 FPS with a full 32×32 terrain plus hundreds of placed blocks, instant place/break, and a compact save format. This is a rewrite of `Terrain`, `Cube`, `Player`, `Save` around a single voxel store; the current three-way split (terrain instances vs. player cubes vs. save renderer) is the root of most problems.

#### 4a. Shared voxel model (`packages/shared`)

- [ ] `BlockType` enum/table: `{ id, name, texture, color, hotbarKey }` for the 9 blocks. Single source of truth for `Hotbar`, texture loading, and save/load.
- [ ] Save format v1: `{ v: 1, size: [32, 32], seed, blocks: Array<[x, y, z, typeId]> }` for *player-placed* blocks plus `removed: Array<[x,y,z]>` for broken terrain, and regenerate the terrain from `seed` on load. A build that today serializes ~2,000 positions as JSON text becomes a few KB. Encode with `Int16Array` → base64 if you want it smaller still. Zod schema shared by client and server.
- [ ] Deterministic terrain generation: replace `noisejs` `new Noise(Math.random())` with a seeded noise function (`simplex-noise` + `alea`, or keep `noisejs` and pass the stored seed). Same seed → same terrain, which is what makes the compact format possible.

#### 4b. Rendering

- [ ] **One zustand store** `useWorldStore`: `Map<string, BlockType>` keyed `"x,y,z"`, plus `place(pos, type)`, `remove(pos)`, `load(build)`, `serialize()`. Terrain and player blocks are the same thing; no more `useCubeStore` + `useInstanceStore`.
- [ ] **One `InstancedMesh` per block type** (9 total), updated imperatively (`setMatrixAt` + `instanceMatrix.needsUpdate`) from a store subscription, not via 2,000 React children. A texture atlas + one material is a further optimization; per-type instanced meshes are already 100× fewer draw calls than today and simpler.
- [ ] Textures loaded once at the top of the editor (`useTexture(BLOCK_TEXTURES)` with `preload`), `NearestFilter`, correct `colorSpace`. No component below that calls `useTexture`.
- [ ] Highlight: a single wireframe/outline box mesh moved to the targeted block position. Never mutate instance colors.
- [ ] Shadows: directional light with a tight `shadow-camera` frustum around the 32×32 area (or no dynamic shadows at all plus simple per-face vertex AO). No shadow-casting point light. Keep `<BakeShadows />`.
- [ ] Drop `preserveDrawingBuffer`; for thumbnails, render on demand: `gl.render(scene, camera); gl.domElement.toDataURL()` inside the save handler.

#### 4c. Physics and interaction

- [ ] Terrain colliders: replace per-block `CuboidCollider`s. Options, pick one:
  1. **`InstancedRigidBodies`** (`@react-three/rapier`) with `type="fixed"` mirroring the instanced meshes. Least code change; Rapier handles thousands of fixed cuboids fine, the cost today is React, not physics.
  2. A single **`HeightfieldCollider`** for the terrain surface + a few large cuboids for the boundary walls, and `InstancedRigidBodies` only for player-placed blocks. Fastest, but terrain must stay a heightmap (breaking terrain blocks then needs option 1 for the "removed" set).
  3. No physics for blocks at all: kinematic player with a DDA/voxel raycast against the store (classic Minecraft approach). Best performance, most code. Defer unless 1 and 2 aren't enough.
  Recommendation: start with 1; measure; move to 2 only if needed.
- [ ] Targeting: raycast **only against the instanced meshes** (`raycaster.intersectObjects(blockMeshes, false)`) with `raycaster.far = 7` so distance is checked by the raycaster, not by hand. Use `instanceId` + `face.normal` to compute the block hit and the adjacent placement cell (replaces the `Math.floor(faceIndex / 2)` lookup table).
- [ ] Input: use the R3F pointer event (`e.button`), not `window.event`. Move hotbar selection and save into `keydown` listeners / `useKeyboardControls` subscriptions so `setState` never runs inside `useFrame`. Add mouse-wheel hotbar cycling.
- [ ] `Player`: everything module-level (`objMem`, `saveMem`, `SPEED`) becomes refs; preallocate vectors once with `useMemo`; keep `useFrame` allocation-free.
- [ ] Save flow: `serialize()` → `addBuild({ name, data, thumbnail })` mutation → toast. No `document.querySelector`.

#### 4d. Saved-build viewer

- [ ] `Save`/`SavedBuild` reuse the same `WorldRenderer` component as the editor (read-only, `OrbitControls`, no physics). Delete the duplicate texture/instance code.
- [ ] Profile shows build **thumbnails** (from 4b) and only mounts a `<Canvas>` for the build the user clicks. Today every profile visit boots a full WebGL scene.

#### 4e. Data fetching

- [ ] `QUERY_ME` / `QUERY_USER` fetch build *metadata* (`id, name, thumbnail, createdAt`); `QUERY_BUILD(id)` fetches `data` only when a build is opened.
- [ ] Apollo: `fetchPolicy: "cache-and-network"` for lists, `update`/`refetchQueries` after mutations instead of full reloads.

**Done when:** editor holds 60 FPS on a laptop iGPU with terrain + 500 placed blocks; place/break is immediate; a saved build is under 10 KB; profile page loads without a WebGL context until a build is opened. Record the after-numbers next to the baseline in `docs/BASELINE.md`.

### Phase 5 — Functionality fixes and feature completion — NEXT

Everything from the bug list not already fixed by Phases 3–4:

- [ ] `<RequireAuth>` route wrapper replacing the copy-pasted `userParam`/`Navigate` blocks in `Editor`, `Profile`, `PostModal`, `SavedBuild`. Fix `/Editor` and `/test` navigations.
- [ ] Fix the `savedBuilds.length && ...` render-`0` bug (`length > 0 &&`).
- [ ] Wire up `deleteFriend`, `deleteBuild`, `updateThought`/`deleteThought` (owner only), `deleteReaction` in the UI.
- [ ] Token expiry: on `UNAUTHENTICATED` error from the Apollo error link, clear the token and redirect to `/login` with a message, instead of silently failing.
- [ ] Form validation with zod on signup/login/post (email format, password length, 280-char limit) with inline error messages that match server errors.
- [ ] Error boundaries around the routes and around each `<Canvas>` (a WebGL failure shouldn't blank the whole page).
- [ ] Empty states (no posts, no friends, no builds) and loading skeletons instead of the bare "Loading..." strings.
- [ ] Date formatting on the client (`Intl.DateTimeFormat` / relative time) since the server no longer formats.

**Done when:** every row in `docs/BASELINE.md` is "works", including the previously missing features.

### Phase 6 — UI / aesthetics modernization (2–3 days)

Goal: keep the Minecraft/pixel identity, drop the 2022-bootcamp look. Design once, then apply.

- [ ] **Design tokens** in Tailwind v4 `@theme`: palette (dark stone/dirt neutrals + one accent, e.g. the existing `#736bdd` or a grass green), the Minecraft display font for headings only + a readable sans (Inter / system) for body text, spacing/radius scale, a "pixel border" utility (`image-rendering: pixelated` where wanted).
- [ ] **Layout shell**: proper responsive header (logo, nav links, user menu) built with a real disclosure/menu component instead of the hand-rolled `MOBILE-MENU` hamburger; sticky footer; max-width content container. Consider `shadcn/ui` (Radix primitives + Tailwind) for Dialog, DropdownMenu, Toast, Tabs. Or native `<dialog>` + `sonner` for toasts if you want fewer deps.
- [ ] **Home / feed**: post cards with build thumbnail, author avatar (generated from username), relative time, reaction count; "Add post" as a dialog; friend list as a sidebar card that collapses on mobile.
- [ ] **Profile**: header card (username, friend count, add/remove friend button), tabs for Builds / Posts / Friends, build gallery of thumbnails that opens the 3D viewer in a dialog.
- [ ] **Editor HUD**: crosshair; a 9-slot hotbar with block texture icons and the active slot highlighted (replacing the "Selected: Dirt" box); controls overlay on first entry (the existing `GameControls` content) with "click to play" that also requests pointer lock; save dialog with name field and thumbnail preview; pause state on pointer-lock exit.
- [ ] **Auth pages**: centered card, proper labels, inline validation, password visibility toggle.
- [ ] **Polish**: consistent focus rings, reduced-motion support, `prefers-color-scheme` respected (dark is default), page transitions kept subtle, favicon/manifest refreshed with the CHUNK'D logo, meta/OG tags.
- [ ] Accessibility pass: semantic landmarks, labeled buttons (icon-only buttons need `aria-label`), keyboard-navigable menus/dialogs, color contrast ≥ 4.5:1 (the current gray-on-dark text fails).

**Done when:** every page has a before/after screenshot in `docs/`, Lighthouse Accessibility ≥ 95 and Performance ≥ 90 on `/`.

### Phase 7 — Quality, tests, deployment (1 day)

- [ ] Client tests (Vitest + Testing Library): auth store, `RequireAuth`, `Hotbar`, post form validation, world store `place/remove/serialize/load` round-trip (pure logic, no WebGL needed).
- [ ] Playwright smoke: sign up → log in → open editor → canvas renders → save build → build appears on profile → post it → it shows on the feed. Run in CI against `mongodb-memory-server` or a Mongo service container.
- [ ] Production serving: server serves `client/dist` with long-cache headers for hashed assets + SPA fallback; `Dockerfile` (multi-stage: `pnpm --filter client build`, `pnpm --filter server build`, prune dev deps with `pnpm deploy`).
- [ ] Deploy to Render / Fly.io + MongoDB Atlas; env vars set there; run the build-migration script once.
- [ ] Dependabot / Renovate config so this doesn't rot for another four years.
- [ ] README rewrite: new stack, `pnpm` commands, env setup, architecture diagram of the voxel store / save format, live URL.

---

## 3. Decisions (settled)

| Decision | Chosen | Notes |
|---|---|---|
| TypeScript | Yes, but deliberately plain | Interfaces, annotations and unions only. No advanced type work. Every pattern used is documented in [docs/TYPESCRIPT.md](docs/TYPESCRIPT.md). UI components stay `.jsx` until they are rewritten. |
| GraphQL client | Apollo Client (installed 4.x) | Hooks moved to `@apollo/client/react`, `setContext` became `SetContextLink`. |
| Component library | shadcn/ui on Radix, plus Aceternity UI and React Bits | Visual target is a modern dark interface in the spirit of Sketchfab. |
| bcrypt | `bcryptjs` | No native build step, so pnpm never has to be told to run it. |
| Old data | Dropped, fresh database | No migration script needed, so the new `Build` model has no legacy compatibility path. |
| Physics approach (4c) | Still open | Decide during the editor rewrite, after measuring. |
| Hosting | Still open | Render, Fly.io or Railway, plus MongoDB Atlas. |

## 4. Success metrics (fill in before/after)

| Metric | Before | Target | After phases 1-4 |
|---|---|---|---|
| Initial JS for `/` (gzip) | whole app in one bundle | < 200 KB | 141 KB |
| Editor route payload | 3,190 KB | smaller | 1,072 KB |
| WebAssembly shipped | 1,376 KB | none | none |
| Draw calls in editor | ≈ blocks × 6 | < 30 | 6 |
| Blocks handed to the GPU | every block | only visible ones | 2,441 of 5,088 |
| Triangles per frame | 122,148 | fewer | 29,328 |
| Median frame time, software renderer | 158.6 ms | lower | 75.2 ms |
| Size of one saved build | 25,805 B | < 10 KB | 68 B |
| `express.json` body limit | 50 MB | 1 MB | 1 MB |
| Secrets in repo | 1 (JWT signing key) | 0 | 0 |
| Lockfiles | 3 npm | 1 | 1 pnpm |
| Automated checks | none | lint + typecheck + test + build + e2e | typecheck + build in CI, 25-check e2e locally |
| Editor FPS on real hardware | not measured | ≥ 60 | still not measured |
| Lighthouse Perf / A11y on `/` | not measured | ≥ 90 / ≥ 95 | not measured |

## 5. Suggested order and rough effort

| Phase | Effort | Branch |
|---|---|---|
| 0 Baseline | ½ day | `refactor/baseline` |
| 1 pnpm | ½ day | `refactor/pnpm` |
| 2 Server | 1–2 days | `refactor/server` |
| 3 Client toolchain | 1–2 days | `refactor/vite` |
| 4 Editor perf | 2–4 days | `refactor/editor` |
| 5 Functionality | 1 day | `refactor/fixes` |
| 6 UI | 2–3 days | `refactor/ui` |
| 7 Quality + deploy | 1 day | `refactor/ship` |

Roughly two working weeks end to end. Phases 2 and 3 are independent of each other and can be done in either order or in parallel; everything after depends on both.
