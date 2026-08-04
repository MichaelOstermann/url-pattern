import type { PathPattern } from "./types"
import { assertPattern, basePath, compilePath, matchPath, parseUrl, scanPath } from "./compile"

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
