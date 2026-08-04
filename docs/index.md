---
aside: true
---

# url-pattern

<Badge type="info" class="size">
    <span>Minified</span>
    <span>4.45 KB</span>
</Badge>

<Badge type="info" class="size">
    <span>Minzipped</span>
    <span>1.69 KB</span>
</Badge>

**Type-safe url pattern matching.**

## Example

::: code-group

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

:::

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

::: code-group

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

:::
