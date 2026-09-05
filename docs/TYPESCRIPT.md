# The TypeScript in this project, explained

This project is mostly JavaScript. TypeScript is used in the places where the
client and the server have to agree with each other, because that is where a
silent mismatch is expensive and hard to find. Everything here is deliberately
kept to a small part of the language. If you know JavaScript, this document is
all the TypeScript you need to read every `.ts` and `.tsx` file in the repo.

## What is and is not typed

| Area | Language | Why |
|---|---|---|
| `server/src/**` | TypeScript | The database schema and the API contract live here |
| `client/src/lib/**`, `utils/**`, `App.tsx`, `main.tsx` | TypeScript | Auth, data fetching and routing wiring |
| `client/src/pages/**`, `client/src/components/**` | JavaScript (`.jsx`) | Being rewritten in later phases; typed as they are rewritten |

The client's `tsconfig.json` sets `allowJs: true` and `checkJs: false`, which
means the `.jsx` files keep working exactly as they did and are simply not
checked. Nothing forces you to convert a file before you are ready.

## The five things the code actually uses

### 1. Annotating a value

A colon after a name says what kind of value it holds.

```ts
const expiration: string = "2h";

function signToken(user: UserDocument): string {
  ...
}
```

The part after the closing parenthesis is the return type. You can leave
annotations off when the answer is obvious; they are written out here where they
document something worth knowing.

### 2. `interface` for the shape of an object

This is the workhorse. It lists the fields an object has.

```ts
export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  exp: number;
}
```

A `?` after a name means the field may be missing:

```ts
thumbnail?: string;
```

### 3. Union types instead of enums

A union is a list of the only allowed values, written with `|`:

```ts
NODE_ENV: "development" | "test" | "production";
```

We use these rather than `enum` because Node runs our TypeScript by deleting the
types, and an `enum` is not just a type, it generates real code. Unions delete
cleanly. This is also why the config sets `erasableSyntaxOnly`.

### 4. `import type`

When an import is only used as a type, it is written `import type`. Node deletes
types one file at a time and never looks inside the file being imported, so it
needs to be told explicitly.

```ts
import type { UserDocument } from "../models/index.ts";
```

If you import something and only ever use it in an annotation, use `import type`.
If you call it or construct it, use a normal import.

### 5. One generic, in two places

A generic is a type that takes another type in angle brackets. The project uses
exactly two.

```ts
const userSchema = new Schema<UserDocument>({ ... });
```

This tells Mongoose what a user document looks like, so `this.password` inside a
hook is known to be a string.

```ts
const users: HydratedDocument<UserDocument>[] = [];
```

`HydratedDocument<UserDocument>` means "a user that came back from the database",
which is a plain user plus Mongoose's methods like `.save()`. The `[]` on the end
means "an array of those".

That is the whole of the generics in this codebase. If you ever find yourself
needing something more complicated, that is a signal to make the code simpler
rather than the type cleverer.

## Things you will see and can ignore

- `as SignOptions["expiresIn"]` in `server/src/utils/auth.ts` is a cast. It tells
  the compiler "trust me, this string is one of the shapes you accept". Casts are
  an escape hatch; there are two in the entire project and both are commented.
- `z.infer<typeof envSchema>` in the config reads a type back out of the
  validation schema, so the type and the validation cannot drift apart. You never
  have to write that type by hand.

## Running the checks

```sh
pnpm typecheck
```

This checks both packages and produces no files. Nothing is compiled: Node 22 and
newer run `.ts` files directly by stripping the types out, and Vite does the same
for the client. That is why the server has no build step at all.

## If you want to convert a `.jsx` file

1. Rename it to `.tsx`.
2. Run `pnpm typecheck` and read the errors.
3. Add an `interface` for the component's props, and annotate anything the
   compiler cannot work out on its own.

There is no deadline on this and no penalty for leaving a file as `.jsx`.
