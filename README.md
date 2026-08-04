<div align="center">

<h1>url-pattern</h1>

![Minified](https://img.shields.io/badge/Minified-4.45_KB-blue?style=flat-square&labelColor=%2315161D&color=%2369a1ff) ![Minzipped](https://img.shields.io/badge/Minzipped-1.69_KB-blue?style=flat-square&labelColor=%2315161D&color=%2369a1ff)

**Type-safe url pattern matching.**

[Documentation](https://MichaelOstermann.github.io/url-pattern)

</div>

## Example

```ts [Pattern]
const matchPattern = pathPattern("/api/:version{v1|v2}/users/:id");

const result = matchPattern("/api/v1/users/123");
```

```ts [Type]
type Result =
    | undefined
    | {
          version: "v1" | "v2";
          id: string;
      };
```

```ts [Result]
const result = { id: "123", version: "v1" };
```

## Two functions

[`pathPattern`](./pathPattern) matches the path only, and ignores the protocol and host entirely:

```ts
const matchPattern = pathPattern("/:workspaceId/task/:taskId");

matchPattern("/ws1/task/t1"); // {...}
matchPattern("https://anything.com/ws1/task/t1"); // {...}
```

[`urlPattern`](./urlPattern) matches the whole url, and requires a protocol and a host:

```ts
const matchPattern = urlPattern("miko://:workspaceId/task/:taskId");

matchPattern("miko://ws1/task/t1"); // {...}
matchPattern("https://evil.com/ws1/task/t1"); // undefined
```

Reach for `urlPattern` whenever the origin is part of what you are asserting — deep links, webhooks, anything where a url from somewhere else must not be mistaken for one of yours.

## Installation

```sh [npm]
npm install @monstermann/url-pattern
```

```sh [pnpm]
pnpm add @monstermann/url-pattern
```

```sh [yarn]
yarn add @monstermann/url-pattern
```

```sh [bun]
bun add @monstermann/url-pattern
```
