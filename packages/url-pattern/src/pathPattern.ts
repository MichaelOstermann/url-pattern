import type { PathPattern } from "./types"
import { assertPattern, basePath, compilePath, matchPath, parseUrl, scanPath } from "./compile"

/**
 * # pathPattern
 *
 * ```ts
 * function pathPattern<const T extends string>(
 *     pattern: T,
 * ): (url: string) => PathPattern<T> | undefined;
 * ```
 *
 * Creates a pattern matching function that parses urls and extracts typed parameters from paths.
 *
 * Only the path is matched — the protocol, host and search query are ignored. If you need to assert the origin, use `urlPattern` instead.
 *
 * Syntax: `:param` captures a segment, `{a|b}` matches one of several alternatives, `:param{a|b}` captures one of them, `*` matches within a segment and `**` matches one or more segments.
 *
 * Invalid patterns throw when the pattern is created, urls that cannot be parsed return `undefined`.
 *
 * ## Example
 *
 * ```ts
 * import { pathPattern } from "@monstermann/url-pattern";
 *
 * // (url: string) => { version: "v1" | "v2", id: string } | undefined
 * const matchPattern = pathPattern("/api/:version{v1|v2}/users/:id");
 *
 * matchPattern("/api/v1/users/123?page=2"); // { version: "v1", id: "123" }
 * matchPattern("https://example.com/api/v2/users/1"); // { version: "v2", id: "1" }
 * matchPattern("/api/v3/users/123"); // undefined
 * ```
 */
export function pathPattern<const T extends string>(pattern: T): (url: string) => PathPattern<T> | undefined {
    assertPattern(pattern)
    const path = compilePath(pattern, pattern)

    return function (url) {
        let start = -1
        if (url.charCodeAt(0) === 47) {
            if (url.charCodeAt(1) !== 47) start = 0
        }
        else {
            const scheme = url.indexOf("://")
            if (scheme > 0) {
                const authority = scheme + 3
                const slash = url.indexOf("/", authority)
                if (slash > authority) start = slash
            }
        }

        const params: Record<string, string> = {}

        if (start !== -1) {
            const end = scanPath(url, start)
            if (end !== -1) {
                return matchPath(path, url, start, end, params)
                    ? params as any
                    : undefined
            }
        }

        const parsed = parseUrl(url, basePath)
        if (!parsed) return

        const pathname = parsed.pathname
        return matchPath(path, pathname, 0, pathname.length, params)
            ? params as any
            : undefined
    }
}
