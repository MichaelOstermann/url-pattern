---
aside: true
---

# url-pattern

<Badge type="info" class="size">
    <span>Minified</span>
    <span>1.77 KB</span>
</Badge>

<Badge type="info" class="size">
    <span>Minzipped</span>
    <span>761 B</span>
</Badge>

**Type-safe url pattern matching.**

## Example

::: code-group

```ts [Pattern]
const matchPattern = urlPattern(
    "/api/:version{v1|v2}/users/:id?sort&order{asc|desc}",
);

const result = matchPattern("/api/v1/users/123?sort=name&order=asc");
```

```ts [Type]
type Result =
    | undefined
    | {
          params: {
              version: "v1" | "v2";
              id: string;
          };
          search: {
              sort?: string;
              order?: "asc" | "desc";
          };
          raw: {
              hash: string;
              host: string;
              hostname: string;
              href: string;
              origin: string;
              password: string;
              pathname: string;
              port: string;
              protocol: string;
              search: string;
              username: string;
          };
      };
```

```ts [Result]
const result = {
    params: { id: "123", version: "v1" },
    search: { order: "asc", sort: "name" },
    raw: {...},
};
```

:::

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
