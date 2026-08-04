/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { Simplify } from "./internals"

export type PathPattern<T extends string> = Simplify<ParsePath<T>>

export type UrlPattern<T extends string> = Simplify<ParseUrlParams<T>>

export type RequireOrigin<T extends string> = T extends `${string}://${string}`
    ? T
    : "urlPattern requires a protocol and a host, eg. \"https://example.com/path\" - did you mean pathPattern?"

type ParseUrlParams<T extends string> = T extends `${infer Protocol}://${infer Rest}`
    ? Rest extends `${infer Authority}/${infer Path}`
        ? ParseToken<Protocol> & ParseAuthority<Authority> & ParsePath<Path>
        : ParseToken<Protocol> & ParseAuthority<Rest>
    : never

type ParseAuthority<T extends string> = T extends `:${infer Rest}`
    ? Rest extends `${infer Name}:${infer Port}`
        ? ParseParam<Name> & ParseToken<Port>
        : ParseParam<Rest>
    : T extends `${string}:${infer Port}`
        ? ParseToken<Port>
        : {}

type ParseToken<T extends string> = T extends `:${infer Name}` ? ParseParam<Name> : {}

type ParsePath<
    Path extends string,
    Parts = Split<Path, "/">,
> = Parts extends [infer Head, ...infer Tail]
    ? Head extends `:${infer Name}`
        ? ParseParam<Name> & ParsePath<Path, Tail>
        : ParsePath<Path, Tail>
    : {}

type ParseParam<Value extends string> =
    Value extends `${infer Name}{${infer Union}}`
        ? Record<Name, ExtractUnion<Union>>
        : Record<Value, string>

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
