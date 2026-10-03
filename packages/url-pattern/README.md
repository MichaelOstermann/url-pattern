<div align="center">

<h1>url-pattern</h1>

**Type-safe url pattern matching.**

</div>

## Example

```ts
const matchPattern = pathPattern("/api/:version{v1|v2}/users/:id");

const result = matchPattern("/api/v1/users/123");
```

```ts
type Result =
    | undefined
    | {
          version: "v1" | "v2";
          id: string;
      };
```

```ts
const result = { id: "123", version: "v1" };
```

## Two functions

[`pathPattern`](#pathpattern) matches the path only, and ignores the protocol and host entirely:

```ts
const matchPattern = pathPattern("/:workspaceId/task/:taskId");

matchPattern("/ws1/task/t1"); // {...}
matchPattern("https://anything.com/ws1/task/t1"); // {...}
```

[`urlPattern`](#urlpattern) matches the whole url, and requires a protocol and a host:

```ts
const matchPattern = urlPattern("miko://:workspaceId/task/:taskId");

matchPattern("miko://ws1/task/t1"); // {...}
matchPattern("https://evil.com/ws1/task/t1"); // undefined
```

Reach for `urlPattern` whenever the origin is part of what you are asserting — deep links, webhooks, anything where a url from somewhere else must not be mistaken for one of yours.

## Installation

```sh
bun add @monstermann/url-pattern
```

## pathPattern

```ts
function pathPattern<const T extends string>(
    pattern: T,
): (url: string) => PathPattern<T> | undefined;
```

Creates a pattern matching function that parses urls and extracts typed parameters from paths.

Only the path is matched — the protocol, host and search query are ignored. If you need to assert the origin, use [`urlPattern`](#urlpattern) instead.

### Example

```ts
import { pathPattern } from "@monstermann/url-pattern";

const matchPattern = pathPattern("/posts/:id");

matchPattern("/posts/1?page=2");
```

```ts
function matchPattern(url: string):
    | undefined
    | {
          id: string;
      };
```

```ts
{
  id: "1",
}
```

### Origins are ignored

`pathPattern` asserts nothing about where a url came from.

```ts
const matchPattern = pathPattern("/:workspaceId/task/:taskId");

matchPattern("/ws1/task/t1"); // {...}
matchPattern("https://example.com/ws1/task/t1"); // {...}
matchPattern("https://evil.com/ws1/task/t1"); // {...}
matchPattern("miko://ws1/task/t1"); // undefined, "ws1" is the host here
```

In `miko://ws1/task/t1` the workspace id is the **host**, so the path is only `/task/t1`. Custom protocol deep links belong in [`urlPattern`](#urlpattern).

### Urls are normalized first

Matching runs against the path as [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) would have parsed it, not against the string you passed in.

```ts
const matchPattern = pathPattern("/b");

matchPattern("/a/../b"); // {...}, dot segments are resolved
matchPattern("//a/b"); // {...}, "//a" is a host, so the path is "/b"
matchPattern("/a\\b"); // undefined, a backslash becomes a slash
```

With one exception: percent-encoded dot segments are left alone, where the url parser would resolve them. [`urlPattern`](#urlpattern) always goes through the parser, so it differs here.

```ts
pathPattern("/:foo")("/%2e"); // { foo: "." }
urlPattern("*://:host/:foo")("http://a.com/%2e"); // undefined, "%2e" is "."
```

The hash and the search query are never matched, and are ignored if present.

```ts
pathPattern("/foo")("/foo#section"); // {...}
pathPattern("/foo")("/foo?page=2"); // {...}
```

### Invalid input

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

### Path parameters syntax

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

### Customizing behavior

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

## urlPattern

```ts
function urlPattern<const T extends string>(
    pattern: T,
): (url: string) => UrlPattern<T> | undefined;
```

Creates a pattern matching function that matches the **whole** url — protocol, host, port and path.

A pattern must declare a protocol and a host. If you only care about the path, use [`pathPattern`](#pathpattern) instead.

```ts
urlPattern("/posts/:id");
//         ^ type error, and throws: did you mean pathPattern?
```

### Example

```ts
import { urlPattern } from "@monstermann/url-pattern";

const matchPattern = urlPattern("miko://:workspaceId/task/:taskId");

matchPattern("miko://ws1/task/t1");
```

```ts
function matchPattern(url: string):
    | undefined
    | {
          workspaceId: string;
          taskId: string;
      };
```

```ts
{
  workspaceId: "ws1",
  taskId: "t1",
}
```

Note where the pieces land: in `miko://ws1/task/t1` the workspace id is the **host**, so the path is only `/task/t1`. Web urls put it in the path instead, which makes them a different shape:

```ts
urlPattern("miko://:workspaceId/task/:taskId");
urlPattern("https://miko.chat/:workspaceId/task/:taskId");
```

### Why declare the origin

A path-only pattern matches a url from anywhere. That is often fine, and occasionally a security bug:

```ts
const loose = pathPattern("/:workspaceId/task/:taskId");
loose("https://evil.com/ws1/task/t1"); // {...} <- a foreign url became an internal route

const strict = urlPattern("miko://:workspaceId/task/:taskId");
strict("https://evil.com/ws1/task/t1"); // undefined
```

If you accept urls from outside your app — deep links handed over by the OS, webhook callbacks, pasted links — match them with `urlPattern`.

### Protocol syntax

The protocol is matched case-insensitively, so `MIKO://` and `miko://` behave the same.

```ts
// Exactly one protocol
urlPattern("miko://:workspaceId/task/:taskId");

// One of several
urlPattern("{http|https}://miko.chat/:workspaceId");

// Any protocol
urlPattern("*://miko.chat/:workspaceId");

// Captured
urlPattern(":protocol://miko.chat/:workspaceId");
```

### Host syntax

Hosts are matched case-insensitively. `*` matches any characters, including dots.

```ts
// Exactly one host
urlPattern("https://miko.chat/:id");

// Any host
urlPattern("https://*/:id");

// Any subdomain
urlPattern("https://*.miko.chat/:id");

// Partial
urlPattern("https://api.*.miko.chat/:id");

// One of several
urlPattern("https://{miko.chat|miko.dev}/:id");

// Captured — takes the whole host, dots included
urlPattern("https://:host/:id");
```

A captured host is **not** decoded, and comes through exactly as the url parser produced it. Two consequences worth knowing:

```ts
const matchPattern = urlPattern("*://:host/x");

// Custom protocols keep the host verbatim
matchPattern("miko://01KN1NN37T6D4HE94J1SADGMSR/x");
// { host: "01KN1NN37T6D4HE94J1SADGMSR" }

// http(s) lowercase it, because there the host is a domain
matchPattern("https://01KN1NN37T6D4HE94J1SADGMSR/x");
// { host: "01kn1nn37t6d4he94j1sadgmsr" }
```

If you put an identifier in the host, keep it to a single protocol. Mixing `miko://` and `https://` in one pattern will hand you different values for the same id.

Urls are matched by host, so userinfo belongs nowhere in a pattern — declaring it throws. Incoming urls may still carry it, and it changes nothing about which host you are looking at.

```ts
urlPattern("https://user@miko.chat/:id"); // throws: not by userinfo

const matchPattern = urlPattern("https://miko.chat/:id");

matchPattern("https://user:pass@miko.chat/1"); // {...}, the host is miko.chat
matchPattern("https://miko.chat@evil.com/1"); // undefined, the host is evil.com
```

IPv6 hosts are not supported, and throw.

### Port syntax

An omitted port matches any port. Default ports (`:80` for http, `:443` for https) are stripped by the url parser, so they never appear.

```ts
// Any port, present or not
urlPattern("http://localhost/:id");

// Exactly this port
urlPattern("http://localhost:3000/:id");

// Any port, but one must be present
urlPattern("http://localhost:*/:id");

// One of several
urlPattern("http://localhost:{3000|4000}/:id");

// Captured
urlPattern("http://localhost::port/:id");

// Combined with a captured host
urlPattern("http://:host:3000/:id");
```

Because default ports never appear, a pattern that declares one can never match — `https://miko.chat:443/:id` matches nothing at all.

### Path syntax

Everything after the host uses the same syntax as [`pathPattern`](#pathpattern) — `:param`, `{a|b}`, `:param{a|b}`, `*` and `**`.

```ts
const matchPattern = urlPattern(
    "https://miko.chat/api/:version{v1|v2}/users/:id",
);

matchPattern("https://miko.chat/api/v1/users/123");
// { version: "v1", id: "123" }
```

The search query is never matched. Declaring one throws, and an incoming query is ignored.

```ts
urlPattern("https://miko.chat/x?sort"); // throws: search parameters are never matched

urlPattern("https://miko.chat/x")("https://miko.chat/x?sort=name"); // {...}
```

### Invalid input

Urls that cannot be parsed, and paths containing malformed percent escapes, return `undefined` rather than throwing — whatever the OS or a remote caller hands you is safe to pass straight in.

```ts
const matchPattern = urlPattern("miko://:workspaceId/task/:taskId");

matchPattern("miko:///"); // undefined
matchPattern("//"); // undefined
matchPattern(""); // undefined
matchPattern("not a url"); // undefined
```

A url without an origin never matches — there is no origin to assert.

```ts
const matchPattern = urlPattern("http://localhost/:id");

matchPattern("http://localhost/1"); // {...}
matchPattern("/1"); // undefined
matchPattern("//localhost/1"); // undefined
```

Invalid _patterns_ throw when the pattern is created, so mistakes surface at startup rather than silently failing to match.

```ts
urlPattern("/posts/:id"); // throws: did you mean pathPattern?
urlPattern("https:///posts"); // throws: malformed authority
urlPattern("https://foo.com/a{b/c"); // throws: unbalanced braces
urlPattern("https://user@foo.com/x"); // throws: not by userinfo
urlPattern("http://[::1]:3000/x"); // throws: ipv6 hosts are not supported
urlPattern("https://foo.com/posts#top"); // throws: hashes are never matched
urlPattern("https://foo.com/posts?page"); // throws: search parameters are never matched
```
