/* eslint-disable perfectionist/sort-objects */
import { describe, expect, it } from "vitest"
import { pathPattern } from "../src/pathPattern"

const empty = {}

describe("pathPattern", () => {
    describe("Static paths", () => {
        it("should match exact paths", () => {
            const matchPattern = pathPattern("/foo/bar")

            expect(matchPattern("/foo/bar")).toEqual(empty)
        })

        it("should not match partial paths", () => {
            const matchPattern = pathPattern("/foo/bar")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/foo/baz")).toBeUndefined()
            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
            expect(matchPattern("/")).toBeUndefined()
        })

        it("should match root path", () => {
            const matchPattern = pathPattern("/")

            expect(matchPattern("/")).toEqual(empty)
            expect(matchPattern("/foo")).toBeUndefined()
        })

        it("should handle trailing slashes correctly", () => {
            const matchPattern = pathPattern("/foo/bar")

            expect(matchPattern("/foo/bar/")).toEqual(empty)
            expect(matchPattern("/foo/bar//")).toEqual(empty)
        })

        it("should tolerate a missing leading slash", () => {
            const matchPattern = pathPattern("foo/bar")

            expect(matchPattern("/foo/bar")).toEqual(empty)
            expect(matchPattern("/foo/baz")).toBeUndefined()
        })

        it("should treat an empty pattern as the root path", () => {
            const matchPattern = pathPattern("")

            expect(matchPattern("/")).toEqual(empty)
            expect(matchPattern("/a")).toBeUndefined()
        })

        it("should collapse empty segments in the pattern", () => {
            const matchPattern = pathPattern("/foo//bar")

            expect(matchPattern("/foo/bar")).toEqual(empty)
            expect(matchPattern("/foo//bar")).toEqual(empty)
        })

        it("should be case sensitive", () => {
            const matchPattern = pathPattern("/foo")

            expect(matchPattern("/foo")).toEqual(empty)
            expect(matchPattern("/FOO")).toBeUndefined()
            expect(matchPattern("/Foo")).toBeUndefined()
        })

        it("should escape regex metacharacters in static segments", () => {
            expect(pathPattern("/path.with.dots")("/path.with.dots")).toEqual(empty)
            expect(pathPattern("/path.with.dots")("/pathXwithXdots")).toBeUndefined()

            expect(pathPattern("/a(b)c")("/a(b)c")).toEqual(empty)
            expect(pathPattern("/a$b^c")("/a$b^c")).toEqual(empty)
            expect(pathPattern("/a[b]c")("/a[b]c")).toEqual(empty)
            expect(pathPattern("/api-v2/users")("/api-v2/users")).toEqual(empty)
        })

        it("should treat + in a static segment as a literal", () => {
            const matchPattern = pathPattern("/a+b")

            expect(matchPattern("/a+b")).toEqual(empty)
            expect(matchPattern("/a%2Bb")).toEqual(empty)
            expect(matchPattern("/ab")).toBeUndefined()
            expect(matchPattern("/aab")).toBeUndefined()
        })

        it("should match literal segments containing spaces", () => {
            const matchPattern = pathPattern("/hello world/:id")

            expect(matchPattern("/hello%20world/1")).toEqual({ id: "1" })
            expect(matchPattern("/hello world/1")).toEqual({ id: "1" })
        })

        it("should match segments containing an encoded slash", () => {
            expect(pathPattern("/a%2Fb")("/a%2Fb")).toEqual(empty)
            expect(pathPattern("/a%2Fb")("/a/b")).toBeUndefined()
        })

        it("should see paths after url normalization", () => {
            expect(pathPattern("/a/b")("/a/./b")).toEqual(empty)
            expect(pathPattern("/b")("/a/../b")).toEqual(empty)
            expect(pathPattern("/b")("/a/../../b")).toEqual(empty)
            expect(pathPattern("/:foo")("/.")).toBeUndefined()
            expect(pathPattern("/a\\b")("/a\\b")).toBeUndefined()
            expect(pathPattern("/a/b")("/a\\b")).toEqual(empty)
        })
    })

    describe("Union patterns {bar|baz}", () => {
        it("should match one of several literal alternatives", () => {
            const matchPattern = pathPattern("/foo/{bar|baz}")

            expect(matchPattern("/foo/bar")).toEqual(empty)
            expect(matchPattern("/foo/baz")).toEqual(empty)
        })

        it("should not match values outside the union", () => {
            const matchPattern = pathPattern("/foo/{bar|baz}")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/foo/qux")).toBeUndefined()
            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
            expect(matchPattern("/foo/barbaz")).toBeUndefined()
        })

        it("should handle multiple unions in the same path", () => {
            const matchPattern = pathPattern("/foo/{bar|baz}/{qux|quux}")

            expect(matchPattern("/foo/bar/qux")).toEqual(empty)
            expect(matchPattern("/foo/baz/quux")).toEqual(empty)
            expect(matchPattern("/foo/bar/invalid")).toBeUndefined()
        })

        it("should accept a single alternative", () => {
            const matchPattern = pathPattern("/{a}")

            expect(matchPattern("/a")).toEqual(empty)
            expect(matchPattern("/b")).toBeUndefined()
        })

        it("should match unions adjacent to each other", () => {
            const matchPattern = pathPattern("/{a|b}{c|d}")

            expect(matchPattern("/ac")).toEqual(empty)
            expect(matchPattern("/bd")).toEqual(empty)
            expect(matchPattern("/a")).toBeUndefined()
            expect(matchPattern("/ca")).toBeUndefined()
        })

        it("should match unions surrounded by literals", () => {
            const matchPattern = pathPattern("/pre{a|b}post")

            expect(matchPattern("/preapost")).toEqual(empty)
            expect(matchPattern("/prebpost")).toEqual(empty)
            expect(matchPattern("/precpost")).toBeUndefined()
            expect(matchPattern("/apost")).toBeUndefined()
        })

        it("should match unions combined with a wildcard", () => {
            const matchPattern = pathPattern("/*{a|b}")

            expect(matchPattern("/xa")).toEqual(empty)
            expect(matchPattern("/xxxb")).toEqual(empty)
            expect(matchPattern("/a")).toBeUndefined()
            expect(matchPattern("/xc")).toBeUndefined()
        })

        it("should escape regex metacharacters inside alternatives", () => {
            const matchPattern = pathPattern("/{a.b|c}")

            expect(matchPattern("/a.b")).toEqual(empty)
            expect(matchPattern("/c")).toEqual(empty)
            expect(matchPattern("/aXb")).toBeUndefined()
        })

        it("should match alternatives containing spaces", () => {
            const matchPattern = pathPattern("/{a b|c}")

            expect(matchPattern("/a%20b")).toEqual(empty)
            expect(matchPattern("/a b")).toEqual(empty)
        })

        it("should be case sensitive", () => {
            const matchPattern = pathPattern("/{a|b}")

            expect(matchPattern("/A")).toBeUndefined()
        })
    })

    describe("Named parameters :foo", () => {
        it("should capture URL parameters", () => {
            const matchPattern = pathPattern("/:foo/:bar")

            expect(matchPattern("/foo/bar")).toEqual({ foo: "foo", bar: "bar" })
            expect(matchPattern("/bar/baz")).toEqual({ foo: "bar", bar: "baz" })
        })

        it("should not match if segments are missing or extra", () => {
            const matchPattern = pathPattern("/:foo/:bar")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
            expect(matchPattern("/")).toBeUndefined()
        })

        it("should handle single named parameter", () => {
            const matchPattern = pathPattern("/posts/:id")

            expect(matchPattern("/posts/1")).toEqual({ id: "1" })
            expect(matchPattern("/posts/abc123")).toEqual({ id: "abc123" })
        })

        it("should decode URL encoded parameters", () => {
            const matchPattern = pathPattern("/:foo")

            expect(matchPattern("/hello%20world")).toEqual({ foo: "hello world" })
            expect(matchPattern("/hello%2Fworld")).toEqual({ foo: "hello/world" })
            expect(matchPattern("/%41")).toEqual({ foo: "A" })
            expect(matchPattern("/héllo")).toEqual({ foo: "héllo" })
        })

        it("should not decode + in path parameters", () => {
            const matchPattern = pathPattern("/:foo")

            expect(matchPattern("/a+b")).toEqual({ foo: "a+b" })
        })

        it("should not treat an encoded slash as a segment separator", () => {
            const matchPattern = pathPattern("/:foo/:bar")

            expect(matchPattern("/a%2Fb/c")).toEqual({ foo: "a/b", bar: "c" })
        })

        it("should let the last occurrence win for duplicate names", () => {
            const matchPattern = pathPattern("/:id/:id")

            expect(matchPattern("/a/b")).toEqual({ id: "b" })
        })

        it("should capture parameters named like object members", () => {
            expect(pathPattern("/:constructor")("/x")).toEqual({ constructor: "x" })
            expect(pathPattern("/:toString")("/x")).toEqual({ toString: "x" })
        })

        it("should drop a parameter named __proto__ without polluting", () => {
            const result = pathPattern("/:__proto__")("/x")!

            expect(result).toEqual({})
            expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
        })

        it("should treat a colon inside a segment as a literal", () => {
            const matchPattern = pathPattern("/file-:name")

            expect(matchPattern("/file-:name")).toEqual(empty)
            expect(matchPattern("/file-123")).toBeUndefined()
        })
    })

    describe("Named parameters with unions :foo{bar|baz}", () => {
        it("should capture parameter constrained to specific values", () => {
            const matchPattern = pathPattern("/:foo{bar|baz}")

            expect(matchPattern("/bar")).toEqual({ foo: "bar" })
            expect(matchPattern("/baz")).toEqual({ foo: "baz" })
        })

        it("should not match values outside the union", () => {
            const matchPattern = pathPattern("/:foo{bar|baz}")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/qux")).toBeUndefined()
            expect(matchPattern("/bar/baz")).toBeUndefined()
            expect(matchPattern("/BAR")).toBeUndefined()
        })

        it("should handle multiple constrained parameters", () => {
            const matchPattern = pathPattern("/:action{create|edit}/:type{post|comment}")

            expect(matchPattern("/create/post")).toEqual({ action: "create", type: "post" })
            expect(matchPattern("/edit/comment")).toEqual({ action: "edit", type: "comment" })
            expect(matchPattern("/delete/post")).toBeUndefined()
        })

        it("should escape regex metacharacters inside alternatives", () => {
            const matchPattern = pathPattern("/:foo{a.b|c}")

            expect(matchPattern("/a.b")).toEqual({ foo: "a.b" })
            expect(matchPattern("/aXb")).toBeUndefined()
        })

        it("should accept a single alternative", () => {
            const matchPattern = pathPattern("/:foo{bar}")

            expect(matchPattern("/bar")).toEqual({ foo: "bar" })
            expect(matchPattern("/baz")).toBeUndefined()
        })
    })

    describe("Single wildcard *", () => {
        it("should match exactly one URL segment", () => {
            const matchPattern = pathPattern("/foo/*/bar")

            expect(matchPattern("/foo/baz/bar")).toEqual(empty)
            expect(matchPattern("/foo/qux/bar")).toEqual(empty)
        })

        it("should not match zero or multiple segments", () => {
            const matchPattern = pathPattern("/foo/*/bar")

            expect(matchPattern("/foo/bar")).toBeUndefined()
            expect(matchPattern("/foo/baz/qux/bar")).toBeUndefined()
            expect(matchPattern("/foo/baz/bar/qux")).toBeUndefined()
        })

        it("should handle multiple wildcards", () => {
            const matchPattern = pathPattern("/*/foo/*")

            expect(matchPattern("/a/foo/b")).toEqual(empty)
            expect(matchPattern("/x/foo/y")).toEqual(empty)
            expect(matchPattern("/foo/b")).toBeUndefined()
        })

        it("should match a whole segment on its own", () => {
            const matchPattern = pathPattern("/*")

            expect(matchPattern("/a")).toEqual(empty)
            expect(matchPattern("/hello%20world")).toEqual(empty)
            expect(matchPattern("/")).toBeUndefined()
            expect(matchPattern("/a/b")).toBeUndefined()
        })

        it("should match a partial segment", () => {
            const matchPattern = pathPattern("/file-*")

            expect(matchPattern("/file-123")).toEqual(empty)
            expect(matchPattern("/file-abc")).toEqual(empty)
            expect(matchPattern("/other-123")).toBeUndefined()
            expect(matchPattern("/file-123/extra")).toBeUndefined()
        })

        it("should require at least one character", () => {
            const matchPattern = pathPattern("/file-*")

            expect(matchPattern("/file-")).toBeUndefined()
        })

        it("should handle multiple wildcards inside one segment", () => {
            const matchPattern = pathPattern("/a*b*c")

            expect(matchPattern("/axbyc")).toEqual(empty)
            expect(matchPattern("/abc")).toBeUndefined()
            expect(matchPattern("/axb")).toBeUndefined()
        })

        it("should not cross segment boundaries", () => {
            const matchPattern = pathPattern("/foo/*")

            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
        })
    })

    describe("Multi-segment wildcard **", () => {
        it("should match one or more URL segments", () => {
            const matchPattern = pathPattern("/foo/**/bar")

            expect(matchPattern("/foo/baz/bar")).toEqual(empty)
            expect(matchPattern("/foo/baz/qux/bar")).toEqual(empty)
        })

        it("should not match zero segments or trailing segments", () => {
            const matchPattern = pathPattern("/foo/**/bar")

            expect(matchPattern("/foo/bar")).toBeUndefined()
            expect(matchPattern("/foo/baz/bar/qux")).toBeUndefined()
        })

        it("should match deeply nested paths", () => {
            const matchPattern = pathPattern("/foo/**/bar")

            expect(matchPattern("/foo/a/b/c/d/e/bar")).toEqual(empty)
        })

        it("should match at the start of a pattern", () => {
            const matchPattern = pathPattern("/**/bar")

            expect(matchPattern("/a/bar")).toEqual(empty)
            expect(matchPattern("/a/b/c/bar")).toEqual(empty)
            expect(matchPattern("/bar")).toBeUndefined()
        })

        it("should match at the end of a pattern", () => {
            const matchPattern = pathPattern("/foo/**")

            expect(matchPattern("/foo/a")).toEqual(empty)
            expect(matchPattern("/foo/a/b/c")).toEqual(empty)
            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/bar/a")).toBeUndefined()
        })

        it("should match a whole path on its own", () => {
            const matchPattern = pathPattern("/**")

            expect(matchPattern("/a")).toEqual(empty)
            expect(matchPattern("/a/b/c")).toEqual(empty)
            expect(matchPattern("/")).toBeUndefined()
        })

        it("should require one segment per occurrence when adjacent", () => {
            const matchPattern = pathPattern("/**/**")

            expect(matchPattern("/a/b")).toEqual(empty)
            expect(matchPattern("/a/b/c")).toEqual(empty)
            expect(matchPattern("/a")).toBeUndefined()
        })

        it("should handle multiple occurrences separated by literals", () => {
            const matchPattern = pathPattern("/a/**/b/**/c")

            expect(matchPattern("/a/1/b/2/c")).toEqual(empty)
            expect(matchPattern("/a/1/2/b/3/c")).toEqual(empty)
            expect(matchPattern("/a/b/c")).toBeUndefined()
            expect(matchPattern("/a/1/b/c")).toBeUndefined()
        })

        it("should backtrack when a later segment repeats", () => {
            const matchPattern = pathPattern("/foo/**/bar/:id")

            expect(matchPattern("/foo/bar/bar/1")).toEqual({ id: "1" })
            expect(matchPattern("/foo/a/bar/b/bar/2")).toEqual({ id: "2" })
        })

        it("should not leave parameters behind from abandoned branches", () => {
            expect(pathPattern("/**/:id")("/a/b")).toEqual({ id: "b" })
            expect(pathPattern("/**/:id/x/:other")("/a/1/x/2")).toEqual({ id: "1", other: "2" })
        })

        it("should combine with single wildcards and parameters", () => {
            expect(pathPattern("/*/**")("/a/b")).toEqual(empty)
            expect(pathPattern("/:a/**/:b")("/1/x/2")).toEqual({ a: "1", b: "2" })
        })
    })

    describe("Origin handling", () => {
        it("should match URLs from any origin", () => {
            const matchPattern = pathPattern("/:foo")

            expect(matchPattern("http://foo.com/1")).toEqual({ foo: "1" })
            expect(matchPattern("http://bar.com/1")).toEqual({ foo: "1" })
            expect(matchPattern("https://example.com/test")).toEqual({ foo: "test" })
            expect(matchPattern("https://user:pass@example.com:8443/test")).toEqual({ foo: "test" })
        })

        it("should match custom protocols", () => {
            const matchPattern = pathPattern("/task/:id")

            expect(matchPattern("miko://workspace/task/1")).toEqual({ id: "1" })
        })

        it("should treat the first segment of a custom protocol url as the host", () => {
            const matchPattern = pathPattern("/:workspaceId/task/:taskId")

            expect(matchPattern("/ws1/task/t1")).toEqual({ workspaceId: "ws1", taskId: "t1" })
            expect(matchPattern("https://example.com/ws1/task/t1")).toEqual({ workspaceId: "ws1", taskId: "t1" })
            expect(matchPattern("miko://ws1/task/t1")).toBeUndefined()
        })

        it("should ignore the hash of a url", () => {
            const matchPattern = pathPattern("/foo")

            expect(matchPattern("/foo#section")).toEqual(empty)
            expect(matchPattern("/foo?bar=1#section")).toEqual(empty)
        })

        it("should match a server request url", () => {
            const matchPattern = pathPattern("/users/:id")

            expect(matchPattern("http://localhost:3000/users/1")).toEqual({ id: "1" })
            expect(matchPattern("http://localhost:3000/users/1?sort=name")).toEqual({ id: "1" })
            expect(matchPattern("http://localhost:3000/users/1#top")).toEqual({ id: "1" })
            expect(matchPattern("http://localhost:3000/users")).toBeUndefined()
            expect(matchPattern("http://localhost:3000/orders/1")).toBeUndefined()
        })

        it("should give the same answer however the origin is spelled", () => {
            const matchPattern = pathPattern("/users/:id")
            const urls = [
                "/users/1",
                "http://localhost/users/1",
                "http://localhost:3000/users/1",
                "https://example.com/users/1",
                "http://localhost:3000/users/1?a=1#b",
                "http://localhost:3000/orders/../users/1",
            ]

            for (const url of urls) {
                expect(matchPattern(url)).toEqual({ id: "1" })
            }
        })
    })

    describe("Hash and search in the pattern", () => {
        it("should reject patterns declaring a hash", () => {
            expect(() => pathPattern("/foo#bar")).toThrow(/hashes are never matched/)
            expect(() => pathPattern("/foo#")).toThrow(/hashes are never matched/)
            expect(() => pathPattern("/foo#a?b")).toThrow(/hashes are never matched/)
        })

        it("should reject patterns declaring search parameters", () => {
            expect(() => pathPattern("/foo?bar")).toThrow(/search parameters are never matched/)
            expect(() => pathPattern("/foo?")).toThrow(/search parameters are never matched/)
        })

        it("should ignore the search query of a matched url", () => {
            const matchPattern = pathPattern("/foo")

            expect(matchPattern("/foo?bar=1")).toEqual(empty)
            expect(matchPattern("/foo?bar=1&baz=2")).toEqual(empty)
        })
    })

    describe("Complex patterns", () => {
        it("should combine multiple pattern types", () => {
            const matchPattern = pathPattern("/api/:version{v1|v2}/users/:id")

            expect(matchPattern("/api/v1/users/123?sort=name&order=asc")).toEqual({ version: "v1", id: "123" })
            expect(matchPattern("/api/v2/users/456")).toEqual({ version: "v2", id: "456" })
            expect(matchPattern("/api/v3/users/123")).toBeUndefined()
        })

        it("should combine wildcards and parameters", () => {
            const matchPattern = pathPattern("/files/**/:name{a|b}/*")

            expect(matchPattern("/files/x/y/a/z?tags=1&tags=2")).toEqual({ name: "a" })
            expect(matchPattern("/files/a/z")).toBeUndefined()
        })
    })

    describe("Invalid input", () => {
        it("should return undefined instead of throwing on unparseable urls", () => {
            const matchPattern = pathPattern("/:foo")

            expect(matchPattern("//")).toBeUndefined()
            expect(matchPattern("")).toBeUndefined()
            expect(matchPattern("miko:///")).toBeUndefined()
            expect(matchPattern("not a url")).toEqual({ foo: "not a url" })
        })

        it("should read a leading double slash as an authority", () => {
            expect(pathPattern("/:foo")("//foo//bar")).toEqual({ foo: "bar" })
            expect(pathPattern("/foo/bar")("//foo//bar")).toBeUndefined()
        })

        it("should return undefined instead of throwing on malformed escapes", () => {
            const matchPattern = pathPattern("/:foo")

            expect(matchPattern("/%%%")).toBeUndefined()
            expect(matchPattern("miko://%%%")).toBeUndefined()
            expect(matchPattern("/%E0%A4%A")).toBeUndefined()
        })

        it("should strip control characters like the url parser does", () => {
            const matchPattern = pathPattern("/:foo")

            expect(matchPattern("/a\nb")).toEqual({ foo: "ab" })
        })

        it("should not throw for any input shape", () => {
            const matchPattern = pathPattern("/:workspaceId/task/:taskId")
            const urls = ["", "/", "//", "///", "%", "%%%", "::::", "not a url", "miko:///", "miko://", "http://", "a/b/c/d/e", "?", "#", "/?#", "/b://%2e"]

            for (const url of urls) {
                expect(() => matchPattern(url)).not.toThrow()
            }
        })
    })

    describe("Invalid patterns", () => {
        it("should throw on unbalanced braces", () => {
            expect(() => pathPattern("/a{b/c")).toThrow(/unbalanced braces/)
            expect(() => pathPattern("/a}b")).toThrow(/unbalanced braces/)
        })

        it("should throw on empty alternatives", () => {
            expect(() => pathPattern("/{a|}")).toThrow(/empty alternative/)
            expect(() => pathPattern("/{|a}")).toThrow(/empty alternative/)
            expect(() => pathPattern("/{a||b}")).toThrow(/empty alternative/)
            expect(() => pathPattern("/{}")).toThrow(/empty alternative/)
            expect(() => pathPattern("/:a{}")).toThrow(/empty alternative/)
        })

        it("should throw on malformed parameters", () => {
            expect(() => pathPattern("/:")).toThrow(/malformed parameter/)
            expect(() => pathPattern("/:foo*")).toThrow(/malformed parameter/)
            expect(() => pathPattern("/:foo:bar")).toThrow(/malformed parameter/)
            expect(() => pathPattern("/:foo{a|b}extra")).toThrow(/malformed parameter/)
            expect(() => pathPattern("/:foo|bar")).toThrow(/malformed parameter/)
        })

        it("should throw on malformed escapes in the pattern", () => {
            expect(() => pathPattern("/%%%")).toThrow(/malformed escape/)
        })

        it("should name the offending pattern in the error", () => {
            expect(() => pathPattern("/a{b/c")).toThrow(/Invalid pattern "\/a\{b\/c"/)
        })

        it("should validate at creation time, not at match time", () => {
            expect(() => pathPattern("/{}")).toThrow()
            expect(() => pathPattern("/:")).toThrow()
        })
    })

    describe("Reuse", () => {
        it("should return an independent result for every call", () => {
            const matchPattern = pathPattern("/:a")
            const first = matchPattern("/1?b=x")!
            const second = matchPattern("/2?b=y")!

            expect(first).toEqual({ a: "1" })
            expect(second).toEqual({ a: "2" })
            expect(first).not.toBe(second)
        })

        it("should not carry parameters over between calls", () => {
            const matchPattern = pathPattern("/**/:a")

            expect(matchPattern("/x/y/1")).toEqual({ a: "1" })
            expect(matchPattern("/x")).toBeUndefined()
        })

        it("should give the same answer when called repeatedly", () => {
            const matchPattern = pathPattern("/foo/**/bar/:id")

            for (let i = 0; i < 3; i++) {
                expect(matchPattern("/foo/a/bar/b/bar/2")).toEqual({ id: "2" })
                expect(matchPattern("/foo/bar")).toBeUndefined()
            }
        })
    })
})
