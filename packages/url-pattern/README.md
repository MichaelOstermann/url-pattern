<div align="center">

<h1>url-pattern</h1>

![Minified](https://img.shields.io/badge/Minified-1.77_KB-blue?style=flat-square&labelColor=%2315161D&color=%2369a1ff) ![Minzipped](https://img.shields.io/badge/Minzipped-761_B-blue?style=flat-square&labelColor=%2315161D&color=%2369a1ff)

**Type-safe url pattern matching.**

[Documentation](https://MichaelOstermann.github.io/url-pattern)

</div>

## Example

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

## docs

### urlMatcher

```ts
function urlMatcher<const T extends Record<string, string | RouteMatcher>>(
    routes: T,
): (url: string) => MatchedUrl<T> | undefined;
```

Takes a record of urls and returns a matching function which returns the first matching url.

The output is a discriminated union, so you can use `switch` statements or libraries such as [`ts-pattern`](https://github.com/gvergnaud/ts-pattern) or [`match`](https://github.com/MichaelOstermann/match) to further handle the result.

#### Example

`matchUrl` accepts strings, in which case they are processed using `urlPattern`, convenient for simple routes:

```ts [Patterns]
import { urlMatcher } from "@monstermann/url-pattern";

const matchUrl = urlMatcher({
    Home: "/",
    Posts: "/posts",
    Post: "/posts/:id",
});
```

```ts [Type]
function matchUrl(
    url: string,
):
    | { name: "Home"; params: {}; search: {}; raw: Raw }
    | { name: "Posts"; params: {}; search: {}; raw: Raw }
    | { name: "Post"; params: { id: string }; search: {}; raw: Raw };
    | undefined
```

You can also reuse instances of `urlPattern` you may have lying around:

```ts
import { urlMatcher, urlPattern } from "@monstermann/url-pattern";

const matchUrl = urlMatcher({
    Home: urlPattern("/"),
    Posts: urlPattern("/posts"),
    Post: urlPattern("/posts/:id"),
});
```

Finally you can pass any `(url: string) => object | undefined` function for custom behavior:

```ts
import { urlMatcher, urlPattern } from "@monstermann/url-pattern";

const postPattern = urlPattern("/posts/:id");

const matchUrl = urlMatcher({
    Post: (url) => {
        const match = postPattern(url);
        if (!match) return;
        // Process further
    },
});
```

Using [`ts-pattern`](https://github.com/gvergnaud/ts-pattern):

```ts
import { match } from "ts-pattern";

match(matchUrl(url))
    .with({ name: "Home" }, () => console.log("home"))
    .with({ name: "Posts" }, () => console.log("posts"))
    .with({ name: "Post" }, ({ params }) => console.log("post", params.id))
    .exhaustive();
```

Using plain `switch` statements:

```ts
const result = matchUrl(url);

switch (result.name) {
    case "Home":
        console.log("home");
        break;
    case "Posts":
        console.log("posts");
        break;
    case "Post":
        console.log("post", result.params.id);
        break;
}
```

---

## aside: true

### urlPattern

```ts
function urlPattern<const T extends string>(
    pattern: T,
): (url: string) => UrlPattern<T> | undefined;
```

Creates a pattern matching function that parses urls and extracts typed parameters from paths and search queries.

#### Example

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

#### Customizing behavior

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

#### Path parameters syntax

Static paths match exact URL segments.

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

`{}` can be used to match one of several literal alternatives.

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

`:` can be used to capture URL parameters.

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

`:` combined with `{}` captures a parameter constrained to specific values.

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

`*` matches exactly one URL segment.

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

`**` matches one or more URL segments.

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

#### Search parameters syntax

`?` can be used to define optional query parameters.

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

`{}` can constrain query parameters to specific values.

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

`[]` can be used to capture query parameters as arrays.

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

`{}` and `[]` can be combined to constrain array elements to specific values.

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

#### Strict origin matching

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
