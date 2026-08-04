---
aside: true
---

# urlPattern

```ts
function urlPattern<const T extends string>(
    pattern: T,
): (url: string) => UrlPattern<T> | undefined;
```

Creates a pattern matching function that matches the **whole** url — protocol, host, port and path.

A pattern must declare a protocol and a host. If you only care about the path, use [`pathPattern`](./pathPattern) instead.

```ts
urlPattern("/posts/:id");
//         ^ type error, and throws: did you mean pathPattern?
```

## Example

::: code-group

```ts [Pattern]
import { urlPattern } from "@monstermann/url-pattern";

const matchPattern = urlPattern("miko://:workspaceId/task/:taskId");

matchPattern("miko://ws1/task/t1");
```

```ts [Type]
function matchPattern(url: string):
    | undefined
    | {
          workspaceId: string;
          taskId: string;
      };
```

```ts [Result]
{
  workspaceId: "ws1",
  taskId: "t1",
}
```

:::

Note where the pieces land: in `miko://ws1/task/t1` the workspace id is the **host**, so the path is only `/task/t1`. Web urls put it in the path instead, which makes them a different shape:

```ts
urlPattern("miko://:workspaceId/task/:taskId");
urlPattern("https://miko.chat/:workspaceId/task/:taskId");
```

## Why declare the origin

A path-only pattern matches a url from anywhere. That is often fine, and occasionally a security bug:

```ts
const loose = pathPattern("/:workspaceId/task/:taskId");
loose("https://evil.com/ws1/task/t1"); // {...} <- a foreign url became an internal route

const strict = urlPattern("miko://:workspaceId/task/:taskId");
strict("https://evil.com/ws1/task/t1"); // undefined
```

If you accept urls from outside your app — deep links handed over by the OS, webhook callbacks, pasted links — match them with `urlPattern`.

## Protocol syntax

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

## Host syntax

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

## Port syntax

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

## Path syntax

Everything after the host uses the same syntax as [`pathPattern`](./pathPattern) — `:param`, `{a|b}`, `:param{a|b}`, `*` and `**`.

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

## Invalid input

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
