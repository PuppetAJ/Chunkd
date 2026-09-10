# Security

What was found, what changed, and what was left alone on purpose. Two audits
were run against the app in September 2026, one by me and one independently,
and this is the merged result with every claim checked against a production
build rather than taken from either write-up.

## Reporting something

If you find a problem here, open an issue on the repository. There is no
private channel and no bounty, because there is nothing here to protect: the
site is a portfolio demo that holds no real data and wipes itself every few
hours. See the threat model below for what that does and does not excuse.

## The threat model

This is a portfolio site. It is never meant to hold anyone's real data. That
changes what matters. A product has to protect its users indefinitely. This
site has three jobs:

1. Stay up when a reviewer clicks the link.
2. Look good when they arrive.
3. Never embarrass the person whose name is in the footer.

Everything below is judged against those three, and several things a product
would need are deliberately absent because they serve none of them.

## The reset

The single biggest decision. The database is wiped and rebuilt from
`server/src/seeders/showcaseBuilds.json` on a schedule. This is what makes the
demo account safe to leave open: anything anyone posts lasts until the next
reset and no longer. It also means there is no user data worth backing up. The
showcase file in git is the backup and the canonical state.

The seeder was reworked so it can run on a timer:

- It refuses to touch a production database unless `SEED_ALLOW_PRODUCTION=1`
  is set. A developer with the wrong `.env` loaded is stopped. The scheduled
  job passes the flag on purpose.
- It checks whether anyone has used the site since the last reset, and if not,
  leaves the database alone. Most runs will find nothing to do, and wiping and
  rebuilding anyway cost a few seconds of password hashing and showed whoever
  was loading the page at that moment an empty feed. `--force` resets anyway.
- It keeps the demo account's row and clears only its content and follows, so a
  token issued before a reset still works after it. Previously the account was
  deleted and recreated with a new id, and anyone mid-session was told their
  account no longer existed.

The signup page, the demo button and the landing page all say the site resets,
so a real person who signs up knows what to expect.

### Setting up the schedule on Railway

A second service from the same repository, with a cron schedule.

```
Service:        chunkd-reset
Cron schedule:  0 */6 * * *          (every six hours, UTC)
Config file:    railway.reset.json
Variables:      MONGODB_URI          (reference the database service)
                NODE_ENV=production
                SEED_ALLOW_PRODUCTION=1
```

The config file matters. Both services build from the same repository, and a
service left on the default config path reads `railway.json`, which is the
API's: it would start the API instead of the seeder and never exit.
`railway.reset.json` sets the start command to `pnpm --filter server seed` and
turns off restart-on-failure, so a failed reset waits for the next schedule
rather than retrying in a loop.

Railway runs the command in the already-built image and the job is finished
when the process exits, which the seeder does after `disconnectFromDatabase()`.

## What was found and what changed

### One request could crash the API

`User.following` and `User.followers` refer back to `User`, so a query can nest
them without limit. Each level asks the database about every user the level
above returned. Measured:

| Depth | Time    | Response         |
|-------|---------|------------------|
| 5     | 1.9 s   | 3.1 MB           |
| 6     | 10.3 s  | 15.6 MB          |
| 7     | crashed | heap exhausted   |

A 400 byte request with no account behind it took the process down with
`FATAL ERROR: JavaScript heap out of memory`. On Railway that is a restart loop
for as long as someone keeps sending it.

Fixed in `server/src/utils/queryLimits.ts`, a validation rule that measures
every operation before it runs and refuses anything deeper than 6 levels or
wider than 150 fields. Fragments are followed so nesting cannot hide in them.
The deepest real client query is 4 levels and the widest is about 26 fields.

Depth alone was not enough. A hundred aliased copies of a shallow query run in
parallel and cost a hundred times as much, which is why width is capped too.
The first version of the cap let a query of exactly the limit through, which
the live check caught and the test now pins.

Alongside this, `users` and the per-user lists (`following`, `followers`,
`thoughts`, `builds`) are capped at 100 rows. The counts stay exact. This is
what shrinks the fan-out at the depths that are still allowed: the depth 6
query that took 426 ms before now takes 11 ms.

There are tests in `server/src/utils/queryLimits.test.ts`, run with
`pnpm test`, that assert the crash query is refused, that the real client
queries are not, and that fragments and aliases are counted.

### The seeder could wipe production

`pnpm seed` ran `deleteMany({})` on every collection against whatever
`MONGODB_URI` pointed at, with no guard. See "The reset" above for the fix and
why it is a flag rather than a wall.

### One missing variable opened four holes

If `NODE_ENV` was anything other than `production`, the content security policy
switched off, CORS reflected any origin, error responses carried stack traces
and introspection turned on. The README documented it and nothing enforced it.

The server now refuses to boot if `RAILWAY_ENVIRONMENT` is set and `NODE_ENV`
is not `production`. Railway sets that variable on every deployment, so it is a
reliable way to tell a host from a laptop.

### The example secret passed validation

`JWT_SECRET` had to be at least 32 characters. The stand-in value in
`.env.example`, `replace-me-with-a-generated-secret`, is 34. A deploy that
copied the example file without editing it would have signed every token with a
secret that is public on GitHub. The validator now rejects the placeholder
outright.

### Password guessing was only loosely limited

The general rate limiter counts every GraphQL request the same, so 120 a minute
was the budget for guessing passwords as much as for reading the feed. The
independent audit suggested that aliasing many `login` calls into one request
would get around even that. I tested it: it does not work here, because
mutations run one after another and a wrong password throws, which nulls the
whole response. HTTP batching is also off by default. But the limit was still
generous.

`server/src/utils/attemptLimiter.ts` adds a second, per-address limit that only
the three token-issuing mutations apply: 20 sign-in attempts per 15 minutes, 60
sign-ups per hour, 30 demo sign-ins per hour. Generous for a person, tight for
a script. It is in memory, which is fine for a single process.

The demo one matters more than it looks. The tokens are for a shared public
account and not worth much, but without a limit a script could mint them faster
than the site resets and use them to post.

### Timing gave away which emails were registered

The sign-in error was the same for an unknown email and a wrong password, but
the unknown email returned in under a millisecond and the wrong password in
about 50, because only the second one ran bcrypt. Anyone timing the endpoint
could tell them apart. Unknown emails now run a comparison against a dummy
hash. Measured after: 50 ms and 50 ms.

### Thumbnails were any string at all

A build's thumbnail is stored as a string and rendered straight into an
`<img src>`. Nothing checked what it was. `javascript:` URLs, external URLs and
SVG were all accepted. None of those is an XSS through `<img>`, which is a
scriptless context in every modern browser, and the production content
security policy blocks external images anyway. But it was unvalidated input
reaching a rendering sink. It now has to be a base64 JPEG, PNG or WebP data
URL, checked on the server where the policy is not the only line of defence.

### Smaller things

- `jwt.verify` now pins `algorithms: ["HS256"]`. jsonwebtoken already limits a
  string secret to the HMAC family, and I confirmed `alg: none` and tampered
  payloads were rejected before the change, so this is belt and braces.
- Usernames are restricted to letters, digits, dots, dashes and underscores.
  Before, a name could contain control characters or look-alike letters from
  other scripts that render as somebody else's name.
- `addUser` names its three fields explicitly instead of passing the argument
  object through to `User.create`. The two are identical today; the day a field
  is added to the mutation for some other reason it must not land in the
  document by accident.
- Each account can hold at most 50 builds. A world is a few kilobytes so this
  is not about disk. It stops one script filling the database between resets.
- The development MongoDB in `docker-compose.yml` now binds to `127.0.0.1`.
  Docker's default publishes a port on every interface, and this database has
  no authentication, so on a laptop with a public address it was open.
- Dependabot is configured for npm and for the workflow's actions, weekly,
  grouped.
- The landing page no longer shows posts by the demo account. That page is the
  one a visitor sees without signing in and it carries the site's name; it
  shows curated builds. Demo posts still appear in the feed, behind a sign-in,
  where they are clearly a sandbox.

## Found on the final pass, in code written during the fixes

- **The demo name could be taken first.** `demoAccount()` creates the shared
  account on first use, and adopts an existing user of that name. A person who
  registered `demo` before anyone pressed the button would have had their
  account turned into the public one, password locked and all. Now `addUser`
  refuses the name, and the seeder creates the account up front so it is
  reserved from the first reset.
- **The showcase authors had a published password.** The seeded accounts share
  `chunkd-dev-password`, which is in the README so developers can sign in as
  anyone. On the live site that meant anyone could sign in as one of the six
  authors whose builds are on the landing page and post straight onto it,
  which is the one page the demo account is kept off. On the live site the
  seeded password is now random and discarded. Nobody needs to sign in as a
  seeded author there.

Two things this pass noticed and left, with the reset as the mitigation:

- Usernames are unique but case-sensitive, so `Demo` and `demo` are different
  accounts. The character allowlist stops look-alike letters from other
  scripts; it does not stop a capital. A real signup can also still post onto
  the landing page for at most a few hours. Accounts are rate limited to 60 an
  hour per address and everything resets.
- The 50-build cap is per account, and the demo account is shared, so it is 50
  builds between all demo users per reset cycle. At six hours that is unlikely
  to be reached.

## Claims from the independent audit that turned out to be wrong

Recorded so nobody re-fixes them.

- **"Introspection stays on in production."** It does not. Apollo Server turns
  it off when `NODE_ENV=production`. Tested: `GraphQL introspection is not
  allowed by Apollo Server`.
- **"Aliased logins bypass the rate limit."** See above. One wrong password
  aborts the whole batch, and HTTP batching is disabled.
- **"`javascript:` and SVG thumbnails are XSS."** Not through `<img src>`. The
  validation was still worth adding.
- **"A 512 KB build can freeze the client."** `deserializeWorld` ignores the
  stored `size` and always regenerates at `WORLD_SIZE`, so there is no
  amplification, and the arrays are bounded by the size cap.
- **"`build(_id)` is a data leak."** Every user's builds are already listed on
  their public profile and opened through this query. There are no private
  builds by design.

## Deliberately not done

Each of these would matter on a product. On a site that resets every few hours
and holds no real accounts, they would be work with no one to protect.

- Password complexity rules, breach checks, account lockout.
- Revoking old tokens when a password changes. Tokens last two hours.
- Requiring the current password to change a username or email.
- Email verification.
- Account deletion and data export.
- A separate rate limit store shared across instances. The API is one process.
- Moderation, reporting or blocking. The reset is the moderation.
- Hiding the GraphQL "did you mean" suggestions on typos. The schema is not a
  secret; the source is public.
- Turning off production source maps. Same reason.
- Pinning GitHub Actions to commit hashes rather than tags. Dependabot covers
  the actions, and hash pins without it would just mean never updating.

## Verified clean

Tested with two real accounts against a production build, not read from the
code.

- Email is returned only to its owner; `null` to strangers and to other users.
- The password field is not in the schema.
- NoSQL operator injection is blocked by GraphQL's scalar typing, in both the
  string and object forms.
- Every cross-account mutation is refused: editing, deleting or posting someone
  else's posts and builds.
- Stack traces, file paths and package versions do not appear in errors.
- Request bodies over 1 MB are refused with 413; builds over 512 KB and
  thumbnails over 256 KB are refused; the feed returns at most 50 rows.
- Content security policy, HSTS, `X-Frame-Options`, `nosniff`, referrer policy
  are set; `X-Powered-By` is not.
- CORS echoes only `CLIENT_ORIGIN`, never the caller's origin.
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in the
  client.
- The login redirect comes from router state set internally, not from the URL.
- External links carry `rel="noreferrer"`.
- Nothing from a request is logged.
- No `VITE_` variables are in use. Any that are added will be public in the
  bundle.
- CSRF does not apply: the token is a bearer header from storage, not a cookie,
  and Apollo's CSRF prevention is on.
- `pnpm audit` is clean for production and development dependencies, and pnpm
  blocks every dependency's install script.

## How to check it yourself

```sh
pnpm test              # includes the query limit tests
pnpm build
NODE_ENV=production PORT=4000 JWT_SECRET=<real> MONGODB_URI=<uri> pnpm start
```

Then, in another terminal, the crash query should come back as a 400 in a few
milliseconds:

```sh
curl -s localhost:4000/graphql -H 'content-type: application/json' \
  -d '{"query":"{ users { following { followers { following { followers { following { followers { username } } } } } } } }"}'
```

And the seeder should refuse to run:

```sh
NODE_ENV=production MONGODB_URI=<uri> JWT_SECRET=<real> pnpm --filter server seed
```
