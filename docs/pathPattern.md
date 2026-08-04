---
aside: true
---

# pathPattern

```ts
function pathPattern<const T extends string>(
    pattern: T,
): (url: string) => PathPattern<T> | undefined;
```

Creates a pattern matching function that parses urls and extracts typed parameters from paths.

Only the path is matched — the protocol, host and search query are ignored. If you need to assert the origin, use [`urlPattern`](./urlPattern) instead.

## Example

::: code-group

```ts [Pattern]
import { pathPattern } from "@monstermann/url-pattern";

const matchPattern = pathPattern("/posts/:id");

matchPattern("/posts/1?page=2");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          id: string;
      };
```

```ts [Result]
{
  id: "1",
}
```

:::

## Origins are ignored

`pathPattern` asserts nothing about where a url came from.

```ts
const matchPattern = pathPattern("/:workspaceId/task/:taskId");

matchPattern("/ws1/task/t1"); // {...}
matchPattern("https://example.com/ws1/task/t1"); // {...}
matchPattern("https://evil.com/ws1/task/t1"); // {...}
matchPattern("miko://ws1/task/t1"); // undefined, "ws1" is the host here
```

In `miko://ws1/task/t1` the workspace id is the **host**, so the path is only `/task/t1`. Custom protocol deep links belong in [`urlPattern`](./urlPattern).

## Urls are normalized first

Matching runs against the path as [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) would have parsed it, not against the string you passed in.

```ts
const matchPattern = pathPattern("/b");

matchPattern("/a/../b"); // {...}, dot segments are resolved
matchPattern("//a/b"); // {...}, "//a" is a host, so the path is "/b"
matchPattern("/a\\b"); // undefined, a backslash becomes a slash
```

With one exception: percent-encoded dot segments are left alone, where the url parser would resolve them. [`urlPattern`](./urlPattern) always goes through the parser, so it differs here.

```ts
pathPattern("/:foo")("/%2e"); // { foo: "." }
urlPattern("*://:host/:foo")("http://a.com/%2e"); // undefined, "%2e" is "."
```

The hash and the search query are never matched, and are ignored if present.

```ts
pathPattern("/foo")("/foo#section"); // {...}
pathPattern("/foo")("/foo?page=2"); // {...}
```

## Invalid input

Urls that cannot be parsed, and paths containing malformed percent escapes, return `undefined` rather than throwing.

```ts
const matchPattern = pathPattern("/:foo");

matchPattern("//"); // undefined
matchPattern("/%%%"); // undefined
```

Invalid _patterns_ throw when the pattern is created, so mistakes surface at startup rather than silently failing to match.

```ts
pathPattern("/a{b/c"); // throws: unbalanced braces
pathPattern("/{a|}"); // throws: empty alternative
pathPattern("/:id*"); // throws: malformed parameter
pathPattern("/posts?page"); // throws: search parameters are never matched
pathPattern("/posts#top"); // throws: hashes are never matched
```

## Path parameters syntax

Static paths match exact url segments.

```ts
const matchPattern = pathPattern("/foo/bar");

matchPattern("/foo/bar"); // {...}
matchPattern("/foo"); // undefined
matchPattern("/foo/baz"); // undefined
matchPattern("/foo/bar/baz"); // undefined
```

`{}` matches one of several literal alternatives.

```ts
const matchPattern = pathPattern("/foo/{bar|baz}");

matchPattern("/foo/bar"); // {...}
matchPattern("/foo/baz"); // {...}
matchPattern("/foo/qux"); // undefined
matchPattern("/foo/bar/baz"); // undefined
```

`:` captures a segment.

```ts
// { foo: string, bar: string }
const matchPattern = pathPattern("/:foo/:bar");

matchPattern("/foo/bar"); // { foo: "foo", bar: "bar" }
matchPattern("/bar/baz"); // { foo: "bar", bar: "baz" }
matchPattern("/foo"); // undefined
matchPattern("/foo/bar/baz"); // undefined
```

A parameter has to be the whole segment — a `:` anywhere else is a literal.

```ts
const matchPattern = pathPattern("/file-:name");

matchPattern("/file-:name"); // {...}
matchPattern("/file-123"); // undefined
```

Captured parameters are percent-decoded.

```ts
const matchPattern = pathPattern("/:foo");

matchPattern("/hello%20world"); // { foo: "hello world" }
```

`:` combined with `{}` constrains a captured parameter to specific values.

```ts
// { foo: "bar" | "baz" }
const matchPattern = pathPattern("/:foo{bar|baz}");

matchPattern("/bar"); // { foo: "bar" }
matchPattern("/baz"); // { foo: "baz" }
matchPattern("/foo"); // undefined
matchPattern("/bar/baz"); // undefined
```

`*` matches any characters within a single url segment.

```ts
const matchPattern = pathPattern("/foo/*/bar");

matchPattern("/foo/baz/bar"); // {...}
matchPattern("/foo"); // undefined
matchPattern("/foo/baz/qux/bar"); // undefined
matchPattern("/foo/baz/bar/qux"); // undefined
```

Because `*` is bounded by the segment it sits in, it can also match part of one.

```ts
const matchPattern = pathPattern("/file-*");

matchPattern("/file-123"); // {...}
matchPattern("/other-123"); // undefined
matchPattern("/file-123/extra"); // undefined
```

`**` matches one or more url segments.

```ts
const matchPattern = pathPattern("/foo/**/bar");

matchPattern("/foo/baz/bar"); // {...}
matchPattern("/foo/baz/qux/bar"); // {...}
matchPattern("/foo/bar"); // undefined, ** needs at least one segment
matchPattern("/foo/baz/bar/qux"); // undefined
```

`**` can also sit at either end of a pattern.

```ts
pathPattern("/files/**")("/files/a/b"); // {...}
pathPattern("/files/**")("/files"); // undefined
pathPattern("/**/edit")("/a/b/edit"); // {...}
pathPattern("/**/edit")("/edit"); // undefined
```

## Customizing behavior

In the wild, there are many different scenarios and corner-cases not covered by this library:

- Handle backwards-compatible deprecated routes
- Parse search parameters
- Combine multiple alternative routes into one
- Recover from invalid routes
- Parse url hash
- Coerce types
- Apply fallbacks
- Validate data, eg. with [zod](https://zod.dev/)

`pathPattern` is intentionally kept simple, for you to be able to quickly wrap it and do whatever you'd like:

```ts
import { pathPattern } from "@monstermann/url-pattern";

const oldPattern = pathPattern("/posts/:id");
const newPattern = pathPattern("/post/:id");

// { id: number, page: number } | undefined
function parseRoute(url: string) {
    const match = oldPattern(url) ?? newPattern(url);
    if (!match) return;

    const id = Number(match.id);
    if (!Number.isInteger(id)) return;

    let page = Number(
        new URL(url, "http://localhost").searchParams.get("page") || "1",
    );
    if (!Number.isInteger(page) || page < 1) page = 1;

    return { id, page };
}
```
