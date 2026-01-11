import type { UrlPattern } from "./types"

const basePath = "http://localhost"

export function urlPattern<const T extends string>(pattern: T): (url: string) => UrlPattern<T> | undefined {
    let re = "^/"
    let captureOffset = 1
    const paramCaptures: [string, number][] = []
    const searchCaptures: [string, boolean, Set<string>][] = []
    let hasExplicitOrigin = false
    let urlA: URL
    try {
        urlA = new URL(pattern)
        hasExplicitOrigin = true
    }
    catch {
        urlA = new URL(pattern, basePath)
    }

    for (const part of urlA.pathname.split("/")) {
        if (!part) continue

        const match = decodeURIComponent(part).match(/^(:)?([^{]+)?(\{[^}]+\})?$/)
        if (!match) continue

        const [raw, capture, name, union] = match

        // *
        if (!capture && name === "*" && !union) {
            re += "[^/]+/"
        }
        // **
        else if (!capture && name === "**" && !union) {
            re += ".+/"
        }
        // foo
        else if (!capture && name && !union) {
            re += `${escapeRegExp(name)}/`
        }
        // {foo|bar}
        else if (!capture && !name && union) {
            re += `(?:${union.slice(1, -1).split("|").map(escapeRegExp).join("|")})/`
        }
        // :foo
        else if (capture && name && !union) {
            re += "([^/]+)/"
            paramCaptures.push([name, captureOffset++])
        }
        // :foo{bar|baz}
        else if (capture && name && union) {
            re += `(${union.slice(1, -1).split("|").map(escapeRegExp).join("|")})/`
            paramCaptures.push([name, captureOffset++])
        }
        else {
            throw new Error(`urlPattern(pattern: ${pattern}): Invalid pattern ${raw}`)
        }
    }
    const r = new RegExp(`${re}?$`)

    for (const part of urlA.search.slice(1).split("&")) {
        if (!part) continue

        const match = part.match(/^([^{[\]]+)?(\{[^}]+\})?(\[\])?$/)
        if (!match) continue

        const [raw, name, union, array] = match

        if (name) {
            const unionSet = union
                ? new Set((union || "").slice(1, -1).split("|"))
                : new Set<string>()
            searchCaptures.push([name, !!array, unionSet])
        }
        else {
            throw new Error(`urlPattern(pattern: ${pattern}): Invalid pattern ${raw}`)
        }
    }

    return function (url) {
        const urlB = new URL(url, basePath)
        // Only enforce origin matching if the pattern had an explicit origin
        if (hasExplicitOrigin && urlA.origin !== urlB.origin) return

        const params: Record<string, string> = {}
        const search: Record<string, string | string[]> = {}
        const raw = {
            hash: urlB.hash,
            host: urlB.host,
            hostname: urlB.hostname,
            href: urlB.href,
            origin: urlB.origin,
            password: urlB.password,
            pathname: urlB.pathname,
            port: urlB.port,
            protocol: urlB.protocol,
            search: urlB.search,
            username: urlB.username,
        }

        const m = urlB.pathname.match(r)
        if (!m) return

        for (const [name, offset] of paramCaptures) {
            params[name] = decodeURIComponent(m[offset]!)
        }

        for (const [name, isArray, union] of searchCaptures) {
            if (!urlB.searchParams.has(name)) continue
            if (isArray) {
                const values = urlB.searchParams.getAll(name)
                if (union.size > 0) {
                    search[name] = values.filter(v => union.has(v))
                }
                else {
                    search[name] = values
                }
            }
            else {
                const value = urlB.searchParams.get(name)!
                if (union.size === 0 || union.has(value)) {
                    search[name] = value
                }
            }
        }

        return { params, raw, search } as any
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
