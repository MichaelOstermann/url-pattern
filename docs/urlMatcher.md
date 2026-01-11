# urlMatcher

```ts
function urlMatcher<const T extends Record<string, string | RouteMatcher>>(
    routes: T,
): (url: string) => MatchedUrl<T> | undefined;
```

Takes a record of urls and returns a matching function which returns the first matching url.

The output is a discriminated union, so you can use `switch` statements or libraries such as [`ts-pattern`](https://github.com/gvergnaud/ts-pattern) or [`match`](https://github.com/MichaelOstermann/match) to further handle the result.

## Example

`matchUrl` accepts strings, in which case they are processed using `urlPattern`, convenient for simple routes:

::: code-group

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

:::

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
