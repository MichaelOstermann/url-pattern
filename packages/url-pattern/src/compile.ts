export const LITERAL = 0
export const PARAM = 1
export const PARAM_UNION = 2
export const UNION = 3
export const REGEX = 4

export interface Group {
    ci: boolean
    kind: number
    literal: string
    name: string
    re: RegExp | undefined
    set: Set<string> | undefined
}

export type PathSegment = Group | "**"

export interface CompiledPath {
    segments: PathSegment[]
    wildcard: boolean
}

export const basePath = "http://localhost"

export function parseUrl(url: string, base?: string): URL | undefined {
    try {
        return new URL(url, base)
    }
    catch {
        return undefined
    }
}

export function assertPattern(pattern: string): void {
    if (pattern.includes("#")) {
        throw new Error(`Invalid pattern "${pattern}": hashes are never matched, remove "#".`)
    }
    if (pattern.includes("?")) {
        throw new Error(`Invalid pattern "${pattern}": search parameters are never matched, remove "?".`)
    }
}

function group(kind: number, ci: boolean, options: Partial<Group>): Group {
    return {
        ci,
        kind,
        literal: options.literal ?? "",
        name: options.name ?? "",
        re: options.re,
        set: options.set,
    }
}

export function compileGroup(source: string, pattern: string, flags?: string): Group {
    const ci = flags === "i"

    if (source.startsWith(":")) {
        const match = source.slice(1).match(/^([^*:|{}]+)(\{[^{}]*\})?$/)
        if (!match) throw new Error(`Invalid pattern "${pattern}": malformed parameter "${source}".`)
        const [, name, union] = match
        if (!union) return group(PARAM, ci, { name: name! })
        return group(PARAM_UNION, ci, {
            name: name!,
            set: toSet(alternatives(union, pattern), ci),
        })
    }

    const parts = source.split(/(\*+|\{[^{}]*\})/).filter(Boolean)

    if (parts.length === 1) {
        const part = parts[0]!
        if (part.startsWith("{")) {
            return group(UNION, ci, { set: toSet(alternatives(part, pattern), ci) })
        }
        if (!/^\*+$/.test(part) && !part.includes("{") && !part.includes("}")) {
            return group(LITERAL, ci, { literal: ci ? part.toLowerCase() : part })
        }
    }

    const body = parts
        .map((part) => {
            if (/^\*+$/.test(part)) return "(?:.+?)"
            if (part.startsWith("{")) return `(?:${alternation(part, pattern)})`
            if (part.includes("{") || part.includes("}")) {
                throw new Error(`Invalid pattern "${pattern}": unbalanced braces in "${source}".`)
            }
            return escapeRegExp(part)
        })
        .join("")

    return group(REGEX, ci, { re: new RegExp(`^${body}$`, flags) })
}

export function matchGroup(group: Group, value: string, params: Record<string, string>): boolean {
    switch (group.kind) {
        case LITERAL:
            return (group.ci ? value.toLowerCase() : value) === group.literal
        case PARAM:
            if (!value) return false
            params[group.name] = value
            return true
        case PARAM_UNION:
            if (!group.set!.has(group.ci ? value.toLowerCase() : value)) return false
            params[group.name] = value
            return true
        case UNION:
            return group.set!.has(group.ci ? value.toLowerCase() : value)
        default:
            return group.re!.test(value)
    }
}

export function compilePath(path: string, pattern: string): CompiledPath {
    const segments = splitPath(path).map((segment) => {
        const decoded = decodePattern(segment, pattern)
        return decoded === "**" ? "**" : compileGroup(decoded, pattern)
    })
    return { segments, wildcard: segments.includes("**") }
}

export function scanPath(url: string, from: number): number {
    let segment = from
    let i = from
    for (; i < url.length; i++) {
        const code = url.charCodeAt(i)
        if (code === 63 || code === 35) break
        if (code < 33 || code > 126 || code === 92) return -1
        if (code === 47) {
            if (isDotSegment(url, segment, i)) return -1
            segment = i + 1
        }
    }
    return isDotSegment(url, segment, i) ? -1 : i
}

function isDotSegment(url: string, from: number, to: number): boolean {
    const length = to - from
    if (length === 1) return url.charCodeAt(from) === 46
    if (length === 2) return url.charCodeAt(from) === 46 && url.charCodeAt(from + 1) === 46
    return false
}

export function matchPath(
    path: CompiledPath,
    url: string,
    from: number,
    to: number,
    params: Record<string, string>,
): boolean {
    if (path.wildcard) return matchWildcard(path.segments, url.slice(from, to), params)

    const segments = path.segments
    const percent = url.indexOf("%", from)
    const encoded = percent !== -1 && percent < to
    let pos = from

    for (let i = 0; i < segments.length; i++) {
        while (pos < to && url.charCodeAt(pos) === 47) pos++
        if (pos === to) return false

        let end = url.indexOf("/", pos)
        if (end === -1 || end > to) end = to

        const segment = segments[i] as Group
        if (!encoded && segment.kind === LITERAL && !segment.ci) {
            const literal = segment.literal
            if (end - pos !== literal.length || !url.startsWith(literal, pos)) return false
        }
        else {
            const raw = url.slice(pos, end)
            const value = encoded ? decode(raw) : raw
            if (value === undefined) return false
            if (!matchGroup(segment, value, params)) return false
        }

        pos = end
    }

    while (pos < to && url.charCodeAt(pos) === 47) pos++
    return pos === to
}

function matchWildcard(segments: PathSegment[], path: string, params: Record<string, string>): boolean {
    const parts: string[] = []
    for (const part of splitPath(path)) {
        const decoded = decode(part)
        if (decoded === undefined) return false
        parts.push(decoded)
    }
    return matchSegments(segments, parts, params, 0, 0)
}

function matchSegments(
    segments: PathSegment[],
    parts: string[],
    params: Record<string, string>,
    i: number,
    j: number,
): boolean {
    if (i === segments.length) return j === parts.length

    const segment = segments[i]!
    if (segment === "**") {
        for (let k = j + 1; k <= parts.length; k++) {
            if (matchSegments(segments, parts, params, i + 1, k)) return true
        }
        return false
    }

    if (j >= parts.length) return false
    if (!matchGroup(segment, parts[j]!, params)) return false
    return matchSegments(segments, parts, params, i + 1, j + 1)
}

function splitPath(path: string): string[] {
    return path.split("/").filter(Boolean)
}

function toSet(values: string[], ci: boolean): Set<string> {
    return new Set(ci ? values.map(value => value.toLowerCase()) : values)
}

function alternation(union: string, pattern: string): string {
    return alternatives(union, pattern).map(escapeRegExp).join("|")
}

function alternatives(union: string, pattern: string): string[] {
    const values = union.slice(1, -1).split("|")
    if (values.some(value => !value)) {
        throw new Error(`Invalid pattern "${pattern}": empty alternative in "${union}".`)
    }
    return values
}

function decodePattern(value: string, pattern: string): string {
    const decoded = decode(value)
    if (decoded === undefined) throw new Error(`Invalid pattern "${pattern}": malformed escape in "${value}".`)
    return decoded
}

function decode(value: string): string | undefined {
    if (!value.includes("%")) return value
    try {
        return decodeURIComponent(value)
    }
    catch {
        return undefined
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
