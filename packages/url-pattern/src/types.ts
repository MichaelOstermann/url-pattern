/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { Simplify } from "./internals"

export type UrlPattern<T extends string> = Simplify<ParseUrlPattern<T> & {
    raw: {
        hash: string
        host: string
        hostname: string
        href: string
        origin: string
        password: string
        pathname: string
        port: string
        protocol: string
        search: string
        username: string
    }
}>

export type ParseUrlPattern<
    Pattern extends string,
    CleanPattern = EnsureLeadingSlash<
        Pattern extends `${infer Head}#${string}` ? Head : Pattern
    >,
> = CleanPattern extends `${infer Path}?${infer Search}`
    ? { params: Simplify<ParsePath<Path>>, search: Simplify<ParseSearch<Search>> }
    : CleanPattern extends string
        ? { params: Simplify<ParsePath<CleanPattern>>, search: {} }
        : never

type ParsePath<
    Path extends string,
    Parts = Split<Path, "/">,
> = Parts extends [infer Head, ...infer Tail]
    ? Head extends `:${infer Name}`
        ? ParsePathParam<Name> & ParsePath<Path, Tail>
        : ParsePath<Path, Tail>
    : {}

type ParseSearch<
    Search extends string,
    Parts = Split<Search, "&">,
> = Parts extends [infer Head, ...infer Tail]
    ? Head extends string
        ? ParseSearchParam<Head> & ParseSearch<Search, Tail>
        : never
    : {}

type ParsePathParam<Value extends string> =
    Value extends `${infer Name}{${infer Union}}`
        ? Record<Name, ExtractUnion<Union>>
        : Record<Value, string>

type ParseSearchParam<Value extends string> =
    Value extends `${infer Part}[]`
        ? Part extends `${infer Name}{${infer Union}}`
            ? Partial<Record<Name, ExtractUnion<Union>[]>>
            : Partial<Record<Part, string[]>>
        : Value extends `${infer Name}{${infer Union}}`
            ? Partial<Record<Name, ExtractUnion<Union>>>
            : Partial<Record<Value, string>>

type EnsureLeadingSlash<Value extends string> = Value extends `/${string}`
    ? Value
    : `/${Value}`

type Split<
    Value extends string,
    Separator extends string,
> = Value extends `${infer Head}${Separator}${infer Tail}`
    ? Head extends ""
        ? Split<Tail, Separator>
        : [Head, ...Split<Tail, Separator>]
    : Value extends ""
        ? []
        : [Value]

type ExtractUnion<Union extends string> = Split<Union, "|">[number]
