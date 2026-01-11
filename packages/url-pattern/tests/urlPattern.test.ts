import { describe, expect, it } from "vitest"
import { urlPattern } from "../src/urlPattern"

describe("urlPattern", () => {
    describe("Static paths", () => {
        it("should match exact paths", () => {
            const matchPattern = urlPattern("/foo/bar")

            expect(matchPattern("/foo/bar")).toMatchObject({
                params: {},
                search: {},
            })
        })

        it("should not match partial paths", () => {
            const matchPattern = urlPattern("/foo/bar")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/foo/baz")).toBeUndefined()
            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
        })

        it("should match root path", () => {
            const matchPattern = urlPattern("/")

            expect(matchPattern("/")).toMatchObject({
                params: {},
                search: {},
            })
        })

        it("should handle trailing slashes correctly", () => {
            const matchPattern = urlPattern("/foo/bar")

            expect(matchPattern("/foo/bar/")).toMatchObject({
                params: {},
                search: {},
            })
        })
    })

    describe("Union patterns {bar|baz}", () => {
        it("should match one of several literal alternatives", () => {
            const matchPattern = urlPattern("/foo/{bar|baz}")

            expect(matchPattern("/foo/bar")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo/baz")).toMatchObject({
                params: {},
                search: {},
            })
        })

        it("should not match values outside the union", () => {
            const matchPattern = urlPattern("/foo/{bar|baz}")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/foo/qux")).toBeUndefined()
            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
        })

        it("should handle multiple unions in the same path", () => {
            const matchPattern = urlPattern("/foo/{bar|baz}/{qux|quux}")

            expect(matchPattern("/foo/bar/qux")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo/baz/quux")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo/bar/invalid")).toBeUndefined()
        })
    })

    describe("Named parameters :foo", () => {
        it("should capture URL parameters", () => {
            const matchPattern = urlPattern("/:foo/:bar")

            expect(matchPattern("/foo/bar")).toMatchObject({
                params: { bar: "bar", foo: "foo" },
                search: {},
            })
            expect(matchPattern("/bar/baz")).toMatchObject({
                params: { bar: "baz", foo: "bar" },
                search: {},
            })
        })

        it("should not match if segments are missing", () => {
            const matchPattern = urlPattern("/:foo/:bar")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/foo/bar/baz")).toBeUndefined()
        })

        it("should decode URL encoded parameters", () => {
            const matchPattern = urlPattern("/:foo")

            expect(matchPattern("/hello%20world")).toMatchObject({
                params: { foo: "hello world" },
            })
            expect(matchPattern("/hello%2Fworld")).toMatchObject({
                params: { foo: "hello/world" },
            })
        })

        it("should handle single named parameter", () => {
            const matchPattern = urlPattern("/posts/:id")

            expect(matchPattern("/posts/1")).toMatchObject({
                params: { id: "1" },
                search: {},
            })
            expect(matchPattern("/posts/abc123")).toMatchObject({
                params: { id: "abc123" },
                search: {},
            })
        })
    })

    describe("Named parameters with unions :foo{bar|baz}", () => {
        it("should capture parameter constrained to specific values", () => {
            const matchPattern = urlPattern("/:foo{bar|baz}")

            expect(matchPattern("/bar")).toMatchObject({
                params: { foo: "bar" },
                search: {},
            })
            expect(matchPattern("/baz")).toMatchObject({
                params: { foo: "baz" },
                search: {},
            })
        })

        it("should not match values outside the union", () => {
            const matchPattern = urlPattern("/:foo{bar|baz}")

            expect(matchPattern("/foo")).toBeUndefined()
            expect(matchPattern("/qux")).toBeUndefined()
            expect(matchPattern("/bar/baz")).toBeUndefined()
        })

        it("should handle multiple constrained parameters", () => {
            const matchPattern = urlPattern("/:action{create|edit}/:type{post|comment}")

            expect(matchPattern("/create/post")).toMatchObject({
                params: { action: "create", type: "post" },
            })
            expect(matchPattern("/edit/comment")).toMatchObject({
                params: { action: "edit", type: "comment" },
            })
            expect(matchPattern("/delete/post")).toBeUndefined()
        })
    })

    describe("Single wildcard *", () => {
        it("should match exactly one URL segment", () => {
            const matchPattern = urlPattern("/foo/*/bar")

            expect(matchPattern("/foo/baz/bar")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo/qux/bar")).toMatchObject({
                params: {},
                search: {},
            })
        })

        it("should not match zero or multiple segments", () => {
            const matchPattern = urlPattern("/foo/*/bar")

            expect(matchPattern("/foo/bar")).toBeUndefined()
            expect(matchPattern("/foo/baz/qux/bar")).toBeUndefined()
            expect(matchPattern("/foo/baz/bar/qux")).toBeUndefined()
        })

        it("should handle multiple wildcards", () => {
            const matchPattern = urlPattern("/*/foo/*")

            expect(matchPattern("/a/foo/b")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/x/foo/y")).toMatchObject({
                params: {},
                search: {},
            })
        })
    })

    describe("Multi-segment wildcard **", () => {
        it("should match one or more URL segments", () => {
            const matchPattern = urlPattern("/foo/**/bar")

            expect(matchPattern("/foo/baz/bar")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo/baz/qux/bar")).toMatchObject({
                params: {},
                search: {},
            })
        })

        it("should not match zero segments or trailing segments", () => {
            const matchPattern = urlPattern("/foo/**/bar")

            expect(matchPattern("/foo/bar")).toBeUndefined()
            expect(matchPattern("/foo/baz/bar/qux")).toBeUndefined()
        })

        it("should match deeply nested paths", () => {
            const matchPattern = urlPattern("/foo/**/bar")

            expect(matchPattern("/foo/a/b/c/d/e/bar")).toMatchObject({
                params: {},
                search: {},
            })
        })
    })

    describe("Search parameters", () => {
        it("should define optional query parameters", () => {
            const matchPattern = urlPattern("/foo?bar&baz")

            expect(matchPattern("/foo")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo?bar=bar")).toMatchObject({
                params: {},
                search: { bar: "bar" },
            })
            expect(matchPattern("/foo?baz=baz")).toMatchObject({
                params: {},
                search: { baz: "baz" },
            })
            expect(matchPattern("/foo?bar=bar&baz=baz")).toMatchObject({
                params: {},
                search: { bar: "bar", baz: "baz" },
            })
        })

        it("should ignore extra query parameters", () => {
            const matchPattern = urlPattern("/foo?bar&baz")

            expect(matchPattern("/foo?bar=bar&baz=baz&qux=qux")).toMatchObject({
                params: {},
                search: { bar: "bar", baz: "baz" },
            })
        })

        it("should work with path parameters", () => {
            const matchPattern = urlPattern("/posts/:id?page")

            expect(matchPattern("/posts/1?page=2")).toMatchObject({
                params: { id: "1" },
                search: { page: "2" },
            })
        })

        it("should handle empty query parameter values", () => {
            const matchPattern = urlPattern("/foo?bar")

            expect(matchPattern("/foo?bar=")).toMatchObject({
                search: { bar: "" },
            })
        })
    })

    describe("Search parameters with unions", () => {
        it("should constrain query parameters to specific values", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}")

            expect(matchPattern("/foo")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo?bar=baz")).toMatchObject({
                params: {},
                search: { bar: "baz" },
            })
            expect(matchPattern("/foo?bar=qux")).toMatchObject({
                params: {},
                search: { bar: "qux" },
            })
        })

        it("should ignore values outside the union", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}")

            expect(matchPattern("/foo?bar=bar")).toMatchObject({
                params: {},
                search: {},
            })
        })

        it("should still capture other valid query parameters", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}")

            expect(matchPattern("/foo?bar=baz&qux=qux")).toMatchObject({
                params: {},
                search: { bar: "baz" },
            })
        })
    })

    describe("Array search parameters", () => {
        it("should capture query parameters as arrays", () => {
            const matchPattern = urlPattern("/foo?bar[]")

            expect(matchPattern("/foo")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo?bar=bar")).toMatchObject({
                params: {},
                search: { bar: ["bar"] },
            })
            expect(matchPattern("/foo?bar=bar&bar=baz")).toMatchObject({
                params: {},
                search: { bar: ["bar", "baz"] },
            })
        })

        it("should ignore non-matching query parameters", () => {
            const matchPattern = urlPattern("/foo?bar[]")

            expect(matchPattern("/foo?bar=bar&baz=baz")).toMatchObject({
                params: {},
                search: { bar: ["bar"] },
            })
        })

        it("should handle multiple array parameters", () => {
            const matchPattern = urlPattern("/foo?bar[]&baz[]")

            expect(matchPattern("/foo?bar=1&bar=2&baz=a&baz=b")).toMatchObject({
                search: { bar: ["1", "2"], baz: ["a", "b"] },
            })
        })
    })

    describe("Array search parameters with unions", () => {
        it("should constrain array elements to specific values", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}[]")

            expect(matchPattern("/foo")).toMatchObject({
                params: {},
                search: {},
            })
            expect(matchPattern("/foo?bar=baz")).toMatchObject({
                params: {},
                search: { bar: ["baz"] },
            })
            expect(matchPattern("/foo?bar=qux")).toMatchObject({
                params: {},
                search: { bar: ["qux"] },
            })
        })

        it("should filter out values outside the union", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}[]")

            expect(matchPattern("/foo?bar=bar")).toMatchObject({
                params: {},
                search: { bar: [] },
            })
            expect(matchPattern("/foo?bar=baz&bar=qux")).toMatchObject({
                params: {},
                search: { bar: ["baz", "qux"] },
            })
        })

        it("should filter mixed valid and invalid values", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}[]")

            expect(matchPattern("/foo?bar=baz&bar=invalid&bar=qux")).toMatchObject({
                search: { bar: ["baz", "qux"] },
            })
        })

        it("should ignore non-matching query parameters", () => {
            const matchPattern = urlPattern("/foo?bar{baz|qux}[]")

            expect(matchPattern("/foo?bar=baz&baz=baz")).toMatchObject({
                params: {},
                search: { bar: ["baz"] },
            })
        })
    })

    describe("Origin matching", () => {
        it("should match URLs from any origin when no origin is specified", () => {
            const matchPattern = urlPattern("/:foo")

            expect(matchPattern("http://foo.com/1")).toMatchObject({
                params: { foo: "1" },
            })
            expect(matchPattern("http://bar.com/1")).toMatchObject({
                params: { foo: "1" },
            })
            expect(matchPattern("https://example.com/test")).toMatchObject({
                params: { foo: "test" },
            })
        })

        it("should only match URLs from specific origin when origin is specified", () => {
            const matchPattern = urlPattern("http://foo.com/:bar")

            expect(matchPattern("http://foo.com/1")).toMatchObject({
                params: { bar: "1" },
            })
            expect(matchPattern("http://bar.com/1")).toBeUndefined()
        })

        it("should match different protocols as different origins", () => {
            const matchPattern = urlPattern("http://foo.com/:bar")

            expect(matchPattern("https://foo.com/1")).toBeUndefined()
        })

        it("should match different ports as different origins", () => {
            const matchPattern = urlPattern("http://foo.com:3000/:bar")

            expect(matchPattern("http://foo.com:3000/1")).toMatchObject({
                params: { bar: "1" },
            })
            expect(matchPattern("http://foo.com/1")).toBeUndefined()
        })
    })

    describe("Raw URL properties", () => {
        it("should include all raw URL properties", () => {
            const matchPattern = urlPattern("/posts/:id?page")
            const result = matchPattern("/posts/1?page=2")

            expect(result).toBeDefined()
            expect(result!.raw).toMatchObject({
                hash: "",
                host: "localhost",
                hostname: "localhost",
                href: "http://localhost/posts/1?page=2",
                origin: "http://localhost",
                password: "",
                pathname: "/posts/1",
                port: "",
                protocol: "http:",
                search: "?page=2",
                username: "",
            })
        })

        it("should capture hash from URL", () => {
            const matchPattern = urlPattern("/foo")
            const result = matchPattern("/foo#section")

            expect(result!.raw.hash).toBe("#section")
        })

        it("should capture full href", () => {
            const matchPattern = urlPattern("http://example.com/foo")
            const result = matchPattern("http://example.com/foo?bar=baz#section")

            expect(result!.raw.href).toBe("http://example.com/foo?bar=baz#section")
        })
    })

    describe("Complex patterns", () => {
        it("should combine multiple pattern types", () => {
            const matchPattern = urlPattern("/api/:version{v1|v2}/users/:id?sort&order{asc|desc}")

            expect(matchPattern("/api/v1/users/123?sort=name&order=asc")).toMatchObject({
                params: { id: "123", version: "v1" },
                search: { order: "asc", sort: "name" },
            })

            expect(matchPattern("/api/v2/users/456?order=desc")).toMatchObject({
                params: { id: "456", version: "v2" },
                search: { order: "desc" },
            })

            expect(matchPattern("/api/v3/users/123")).toBeUndefined()
        })
    })

    describe("Edge cases", () => {
        it("should handle empty path segments gracefully", () => {
            const matchPattern = urlPattern("/foo//bar")

            expect(matchPattern("/foo/bar")).toMatchObject({
                params: {},
            })
        })

        it("should handle patterns with only search parameters", () => {
            const matchPattern = urlPattern("/?foo&bar")

            expect(matchPattern("/?foo=1&bar=2")).toMatchObject({
                search: { bar: "2", foo: "1" },
            })
        })

        it("should return undefined for completely different paths", () => {
            const matchPattern = urlPattern("/api/users")

            expect(matchPattern("/")).toBeUndefined()
            expect(matchPattern("/api")).toBeUndefined()
            expect(matchPattern("/api/posts")).toBeUndefined()
        })

        it("should handle special characters in static segments", () => {
            const matchPattern = urlPattern("/api-v2/users")

            expect(matchPattern("/api-v2/users")).toMatchObject({
                params: {},
            })
        })

        it("should handle patterns with special regex characters", () => {
            const matchPattern = urlPattern("/path.with.dots")

            expect(matchPattern("/path.with.dots")).toMatchObject({
                params: {},
            })
        })
    })
})
