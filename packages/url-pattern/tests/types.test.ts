/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { PathPattern, UrlPattern } from "../src/types"
import { describe, expectTypeOf, it } from "vitest"
import { pathPattern } from "../src/pathPattern"
import { urlPattern } from "../src/urlPattern"

describe("types", () => {
    describe("pathPattern", () => {
        it("should infer path parameters", () => {
            const result = pathPattern("/posts/:id")("/posts/1")!
            expectTypeOf(result).toEqualTypeOf<{ id: string }>()
        })

        it("should infer constrained path parameters", () => {
            const result = pathPattern("/:foo{bar|baz}")("/bar")!
            expectTypeOf(result).toEqualTypeOf<{ foo: "bar" | "baz" }>()
        })

        it("should infer no parameters for static paths", () => {
            const result = pathPattern("/foo/bar")("/foo/bar")!
            expectTypeOf(result).toEqualTypeOf<{}>()
        })

        it("should infer no parameters for wildcards and literal unions", () => {
            const result = pathPattern("/{a|b}/*/**")("/a/x/y")!
            expectTypeOf(result).toEqualTypeOf<{}>()
        })

        it("should infer parameters around wildcards", () => {
            const result = pathPattern("/a/**/:id/*")("/a/x/1/y")!
            expectTypeOf(result).toEqualTypeOf<{ id: string }>()
        })

        it("should not infer a parameter from a colon inside a segment", () => {
            const result = pathPattern("/file-:name")("/file-:name")!
            expectTypeOf(result).toEqualTypeOf<{}>()
        })

        it("should return undefined for unmatched urls", () => {
            expectTypeOf(pathPattern("/x")).returns.toEqualTypeOf<PathPattern<"/x"> | undefined>()
            expectTypeOf(pathPattern("/x")("/x")).toEqualTypeOf<PathPattern<"/x"> | undefined>()
        })

        it("should infer nothing for a widened pattern", () => {
            const pattern: string = "/posts/:id"
            const result = pathPattern(pattern)("/posts/1")!
            expectTypeOf(result).toEqualTypeOf<{}>()
        })
    })

    describe("urlPattern", () => {
        it("should infer host and path parameters", () => {
            const result = urlPattern("miko://:workspaceId/task/:taskId")("miko://ws1/task/t1")!
            expectTypeOf(result).toEqualTypeOf<{
                taskId: string
                workspaceId: string
            }>()
        })

        it("should infer protocol parameters", () => {
            const result = urlPattern(":protocol://foo.com/:id")("https://foo.com/1")!
            expectTypeOf(result).toEqualTypeOf<{
                id: string
                protocol: string
            }>()
        })

        it("should infer port parameters", () => {
            const result = urlPattern("http://localhost::port/:id")("http://localhost:3000/1")!
            expectTypeOf(result).toEqualTypeOf<{ id: string, port: string }>()
        })

        it("should infer a host parameter alongside a literal port", () => {
            const result = urlPattern("http://:host:3000/:id")("http://foo.com:3000/1")!
            expectTypeOf(result).toEqualTypeOf<{ host: string, id: string }>()
        })

        it("should infer constrained host parameters", () => {
            const result = urlPattern("https://:env{eu|us}/:id")("https://eu/1")!
            expectTypeOf(result).toEqualTypeOf<{ env: "eu" | "us", id: string }>()
        })

        it("should infer no parameters for literal origins", () => {
            const result = urlPattern("https://foo.com/bar")("https://foo.com/bar")!
            expectTypeOf(result).toEqualTypeOf<{}>()
        })

        it("should infer no parameters for wildcard and union origins", () => {
            const wildcard = urlPattern("*://*.foo.com/x")("https://a.foo.com/x")!
            expectTypeOf(wildcard).toEqualTypeOf<{}>()

            const union = urlPattern("{http|https}://{foo.com|bar.com}:{80|3000}/x")("http://foo.com:3000/x")!
            expectTypeOf(union).toEqualTypeOf<{}>()
        })

        it("should infer parameters for an origin without a path", () => {
            const result = urlPattern("miko://:workspaceId")("miko://ws1")!
            expectTypeOf(result).toEqualTypeOf<{ workspaceId: string }>()
        })

        it("should return undefined for unmatched urls", () => {
            expectTypeOf(urlPattern("https://foo.com/x")("")).toEqualTypeOf<UrlPattern<"https://foo.com/x"> | undefined>()
        })

        it("should reject patterns without a protocol and host", () => {
            // @ts-expect-error - urlPattern requires a protocol and a host.
            expectTypeOf(urlPattern).toBeCallableWith("/posts/:id")
            // @ts-expect-error - urlPattern requires a protocol and a host.
            expectTypeOf(urlPattern).toBeCallableWith("foo.com/posts")
        })
    })

    describe("Known divergences from runtime behavior", () => {
        it("should type a __proto__ parameter that is dropped at runtime", () => {
            const result = pathPattern("/:__proto__")("/x")!
            expectTypeOf(result).toEqualTypeOf<{ __proto__: string }>()
        })
    })
})
