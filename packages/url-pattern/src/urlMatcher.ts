import type { Simplify } from "./internals"
import type { UrlPattern } from "./types"
import { urlPattern } from "./urlPattern"

type RouteMatcher = (url: string) => object | undefined

export type MatchedUrl<T extends Record<string, string | RouteMatcher>> = {
    [K in keyof T]: T[K] extends string
        ? Simplify<UrlPattern<T[K]> & { name: K }>
        : T[K] extends RouteMatcher
            ? Simplify<Omit<Exclude<ReturnType<T[K]>, undefined>, "name"> & { name: K }>
            : never
}[keyof T]

export function urlMatcher<const T extends Record<string, string | RouteMatcher>>(
    routes: T,
): (url: string) => MatchedUrl<T> | undefined {
    const preparedRoutes: [string, RouteMatcher][] = []

    for (const name in routes) {
        const route = routes[name]!
        if (typeof route === "string") {
            preparedRoutes.push([name, urlPattern(route)])
        }
        else {
            preparedRoutes.push([name, route])
        }
    }

    return function (url) {
        for (const [name, match] of preparedRoutes) {
            const result = match(url)
            if (result) return { ...result, name } as any
        }
        return undefined
    }
}
