import type { RequireOrigin, UrlPattern } from "./types"
import { assertPattern, compileGroup, compilePath, matchGroup, matchPath, parseUrl } from "./compile"

export function urlPattern<const T extends string>(
    pattern: RequireOrigin<T>,
): (url: string) => UrlPattern<T> | undefined {
    const source = pattern as string
    assertPattern(source)

    const index = source.indexOf("://")
    if (index === -1) {
        throw new Error(`Invalid pattern "${source}": urlPattern requires a protocol and a host, eg. "https://example.com/path" - did you mean pathPattern?`)
    }

    const rest = source.slice(index + 3)
    const slash = rest.indexOf("/")
    const authority = slash === -1 ? rest : rest.slice(0, slash)

    if (authority.includes("@")) {
        throw new Error(`Invalid pattern "${source}": urls are matched by host, not by userinfo - remove "@" from "${authority}".`)
    }

    if (/[[\]]/.test(authority)) {
        throw new Error(`Invalid pattern "${source}": ipv6 hosts are not supported.`)
    }

    const parts = authority.match(/^(:?[^:]+)(?::(.*))?$/)
    if (!parts) throw new Error(`Invalid pattern "${source}": malformed authority "${authority}".`)

    const protocolGroup = compileGroup(source.slice(0, index), source, "i")
    const hostGroup = compileGroup(parts[1]!, source, "i")
    const portGroup = parts[2] === undefined ? undefined : compileGroup(parts[2], source)
    const path = compilePath(slash === -1 ? "" : rest.slice(slash), source)

    return function (url) {
        const parsed = parseUrl(url)
        if (!parsed) return

        const params: Record<string, string> = {}
        if (!matchGroup(protocolGroup, parsed.protocol.slice(0, -1), params)) return
        if (!matchGroup(hostGroup, parsed.hostname, params)) return
        if (portGroup && !matchGroup(portGroup, parsed.port, params)) return

        const pathname = parsed.pathname
        if (!matchPath(path, pathname, 0, pathname.length, params)) return

        return params as any
    }
}
