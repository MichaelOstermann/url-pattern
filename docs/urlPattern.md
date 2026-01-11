---
aside: true
---

# urlPattern

```ts
function urlPattern<const T extends string>(
    pattern: T,
): (url: string) => UrlPattern<T> | undefined;
```

Creates a pattern matching function that parses urls and extracts typed parameters from paths and search queries.

## Example

::: code-group

```ts [Pattern]
import { urlPattern } from "@monstermann/url-pattern";

const matchPattern = urlPattern("/posts/:id?page");

matchPattern("/posts/1?page=2");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {
              id: string;
          };
          search: {
              page?: string;
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
{
  params: {
    id: "1",
  },
  search: {
    page: "2",
  },
  raw: {
    hash: "",
    // http://localhost is the fallback origin, as `new URL()` requires one.
    host: "localhost",
    hostname: "localhost",
    href: "http://localhost/posts/1?page=2",
    origin: "http://localhost",
    password: "",
    pathname: "/posts/1",
    port: "",
    protocol: "http:",
    search: "?page=2",
    username: "",
  },
}
```

:::

## Customizing behavior

In the wild, there are many different scenarios and corner-cases not covered by this library:

- Handle backwards-compatible deprecated routes
- Roll your own search parameter parser for non-standard syntax
- Combine multiple alternative routes into one
- Recover from invalid routes
- Parse url hash
- Coerce types
- Apply fallbacks
- Validate data, eg. with [zod](https://zod.dev/)

`urlPattern` is intentionally kept simple, for you to be able to quickly wrap it and do whatever you'd like:

```ts
import { urlPattern } from "@monstermann/url-pattern";

const oldPattern = urlPattern("/posts/:id?page");
const newPattern = urlPattern("/post/:id?page");

// { id: number, page: number } | undefined
function parseRoute(url: string) {
    const match = oldPattern(url) ?? newPattern(url);
    if (!match) return;

    const id = Number(match.params.id);
    if (!Number.isInteger(id)) return;

    let page = Number(match.search.page || "1");
    if (!Number.isInteger(page) || page < 1) page = 1;

    return { id, page };
}
```

## Path parameters syntax

Static paths match exact URL segments.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo/bar");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {};
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo/bar");

// undefined
matchPattern("/foo");
matchPattern("/foo/baz");
matchPattern("/foo/bar/baz");
```

:::

`{}` can be used to match one of several literal alternatives.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo/{bar|baz}");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {};
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo/bar");
matchPattern("/foo/baz");

// undefined
matchPattern("/foo");
matchPattern("/foo/qux");
matchPattern("/foo/bar/baz");
```

:::

`:` can be used to capture URL parameters.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/:foo/:bar");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {
              foo: string;
              bar: string;
          };
          search: {};
          raw: Raw;
      };
```

```ts [Examples]
// { params: { foo: "foo", bar: "bar" }, search: {}, raw: {...} }
matchPattern("/foo/bar");
// { params: { foo: "bar", bar: "baz" }, search: {}, raw: {...} }
matchPattern("/bar/baz");

// undefined
matchPattern("/foo");
matchPattern("/foo/bar/baz");
```

:::

`:` combined with `{}` captures a parameter constrained to specific values.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/:foo{bar|baz}");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {
              foo: "bar" | "baz";
          };
          raw: Raw;
      };
```

```ts [Examples]
// { params: { foo: "bar" }, search: {}, raw: {...} }
matchPattern("/bar");
// { params: { foo: "baz" }, search: {}, raw: {...} }
matchPattern("/baz");

// undefined
matchPattern("/foo");
matchPattern("/bar/baz");
```

:::

`*` matches exactly one URL segment.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo/*/bar");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {};
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo/baz/bar");
matchPattern("/foo/qux/bar");

// undefined
matchPattern("/foo");
matchPattern("/foo/baz/qux/bar");
matchPattern("/foo/baz/bar/qux");
```

:::

`**` matches one or more URL segments.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo/**/bar");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {};
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo/baz/bar");
matchPattern("/foo/baz/qux/bar");

// undefined
matchPattern("/foo");
matchPattern("/foo/bar");
matchPattern("/foo/baz/bar/qux");
```

:::

## Search parameters syntax

`?` can be used to define optional query parameters.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo?bar&baz");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {
              bar?: string;
              baz?: string;
          };
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo");
// { params: {}, search: { bar: "bar" }, raw: {...} }
matchPattern("/foo?bar=bar");
// { params: {}, search: { baz: "baz" }, raw: {...} }
matchPattern("/foo?baz=baz");
// { params: {}, search: { bar: "bar", baz: "baz" }, raw: {...} }
matchPattern("/foo?bar=bar&baz=baz");
// { params: {}, search: { bar: "bar", baz: "baz" }, raw: {...} }
matchPattern("/foo?bar=bar&baz=baz&qux=qux");
```

:::

`{}` can constrain query parameters to specific values.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo?bar{baz|qux}");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {
              bar?: "baz" | "qux";
          };
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo");
// { params: {}, search: { bar: "baz" }, raw: {...} }
matchPattern("/foo?bar=baz");
// { params: {}, search: { bar: "qux" }, raw: {...} }
matchPattern("/foo?bar=qux");
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo?bar=bar");
// { params: {}, search: { bar: "baz" }, raw: {...} }
matchPattern("/foo?bar=baz&qux=qux");
```

:::

`[]` can be used to capture query parameters as arrays.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo?bar[]");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {
              bar?: string[];
          };
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo");
// { params: {}, search: { bar: ["bar"] }, raw: {...} }
matchPattern("/foo?bar=bar");
// { params: {}, search: { bar: ["bar", "baz"] }, raw: {...} }
matchPattern("/foo?bar=bar&bar=baz");
// { params: {}, search: { bar: ["bar"] }, raw: {...} }
matchPattern("/foo?bar=bar&baz=baz");
```

:::

`{}` and `[]` can be combined to constrain array elements to specific values.

::: code-group

```ts [Pattern]
const matchPattern = urlPattern("/foo?bar{baz|qux}[]");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          params: {};
          search: {
              bar?: ("baz" | "qux")[];
          };
          raw: Raw;
      };
```

```ts [Examples]
// { params: {}, search: {}, raw: {...} }
matchPattern("/foo");
// { params: {}, search: { bar: ["baz"] }, raw: {...} }
matchPattern("/foo?bar=baz");
// { params: {}, search: { bar: ["qux"] }, raw: {...} }
matchPattern("/foo?bar=qux");
// { params: {}, search: { bar: [] }, raw: {...} }
matchPattern("/foo?bar=bar");
// { params: {}, search: { bar: ["baz", "qux"] }, raw: {...} }
matchPattern("/foo?bar=baz&bar=qux");
// { params: {}, search: { bar: ["baz"] }, raw: {...} }
matchPattern("/foo?bar=baz&baz=baz");
```

:::

## Strict origin matching

Patterns without an explicit origin match URLs from any origin.

```ts
const matchPattern = urlPattern("/:foo");

matchPattern("http://foo.com/1"); // {...}
matchPattern("http://bar.com/1"); // {...}
```

Patterns with an explicit origin only match URLs from that specific origin.

```ts
const matchPattern = urlPattern("http://foo.com/:bar");

matchPattern("http://foo.com/1"); // {...}
matchPattern("http://bar.com/1"); // undefined
```
