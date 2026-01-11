/* eslint-disable perfectionist/sort-objects */
import { describe, expect, it } from "vitest"
import { urlMatcher } from "../src/urlMatcher"
import { urlPattern } from "../src/urlPattern"

describe("urlMatcher", () => {
    it("should match against multiple routes", () => {
        const matchUrl = urlMatcher({
            Home: "/",
            Posts: "/posts",
            Post: "/posts/:id",
        })

        expect(matchUrl("/")).toMatchObject({
            name: "Home",
            params: {},
            search: {},
        })

        expect(matchUrl("/posts")).toMatchObject({
            name: "Posts",
            params: {},
            search: {},
        })

        expect(matchUrl("/posts/123")).toMatchObject({
            name: "Post",
            params: { id: "123" },
            search: {},
        })
    })

    it("should return undefined when no route matches", () => {
        const matchUrl = urlMatcher({
            Home: "/",
            Posts: "/posts",
        })

        expect(matchUrl("/about")).toBeUndefined()
        expect(matchUrl("/posts/123")).toBeUndefined()
    })

    it("should accept string patterns", () => {
        const matchUrl = urlMatcher({
            User: "/users/:userId",
            Post: "/posts/:postId",
        })

        expect(matchUrl("/users/42")).toMatchObject({
            name: "User",
            params: { userId: "42" },
        })

        expect(matchUrl("/posts/99")).toMatchObject({
            name: "Post",
            params: { postId: "99" },
        })
    })

    it("should accept urlPattern instances", () => {
        const matchUrl = urlMatcher({
            Home: urlPattern("/"),
            Posts: urlPattern("/posts"),
            Post: urlPattern("/posts/:id"),
        })

        expect(matchUrl("/")).toMatchObject({
            name: "Home",
            params: {},
        })

        expect(matchUrl("/posts/123")).toMatchObject({
            name: "Post",
            params: { id: "123" },
        })
    })

    it("should mix string patterns and urlPattern instances", () => {
        const matchUrl = urlMatcher({
            Home: "/",
            Posts: urlPattern("/posts"),
            Post: "/posts/:id",
        })

        expect(matchUrl("/")).toMatchObject({ name: "Home" })
        expect(matchUrl("/posts")).toMatchObject({ name: "Posts" })
        expect(matchUrl("/posts/123")).toMatchObject({ name: "Post" })
    })

    it("should accept custom matcher functions", () => {
        const postPattern = urlPattern("/posts/:id")

        const matchUrl = urlMatcher({
            Post: (url) => {
                const match = postPattern(url)
                if (!match) return

                const id = Number(match.params.id)
                if (!Number.isInteger(id)) return

                return { params: { id }, search: match.search, raw: match.raw }
            },
        })

        expect(matchUrl("/posts/123")).toMatchObject({
            name: "Post",
            params: { id: 123 },
        })

        expect(matchUrl("/posts/abc")).toBeUndefined()
    })

    it("should mix string patterns and custom functions", () => {
        const matchUrl = urlMatcher({
            Home: "/",
            ValidatedPost: (url) => {
                const match = urlPattern("/posts/:id")(url)
                if (!match) return
                if (!/^\d+$/.test(match.params.id)) return
                return match
            },
        })

        expect(matchUrl("/")).toMatchObject({ name: "Home" })
        expect(matchUrl("/posts/123")).toMatchObject({
            name: "ValidatedPost",
            params: { id: "123" },
        })
        expect(matchUrl("/posts/abc")).toBeUndefined()
    })

    it("should process custom functions that add extra properties", () => {
        const matchUrl = urlMatcher({
            Post: (url) => {
                const match = urlPattern("/posts/:id")(url)
                if (!match) return
                return { ...match, extra: "custom property" }
            },
        })

        expect(matchUrl("/posts/123")).toMatchObject({
            name: "Post",
            params: { id: "123" },
            extra: "custom property",
        })
    })

    it("should include raw URL properties in matched routes", () => {
        const matchUrl = urlMatcher({
            Post: "/posts/:id",
        })

        const result = matchUrl("/posts/123?highlight=true#comments")

        expect(result).toBeDefined()
        expect(result!.raw).toMatchObject({
            pathname: "/posts/123",
            search: "?highlight=true",
            hash: "#comments",
        })
    })

    it("should handle empty routes object", () => {
        const matchUrl = urlMatcher({})

        expect(matchUrl("/")).toBeUndefined()
        expect(matchUrl("/anything")).toBeUndefined()
    })

    it("should handle routes with special characters", () => {
        const matchUrl = urlMatcher({
            Api: "/api/v1.0/resource",
            Path: "/path-with-dashes",
        })

        expect(matchUrl("/api/v1.0/resource")).toMatchObject({ name: "Api" })
        expect(matchUrl("/path-with-dashes")).toMatchObject({ name: "Path" })
    })

    it("should handle overlapping patterns correctly", () => {
        const matchUrl = urlMatcher({
            Static: "/users/profile",
            Dynamic: "/users/:id",
        })

        expect(matchUrl("/users/profile")).toMatchObject({
            name: "Static",
        })

        expect(matchUrl("/users/123")).toMatchObject({
            name: "Dynamic",
            params: { id: "123" },
        })
    })

    it("should handle trailing slashes consistently", () => {
        const matchUrl = urlMatcher({
            Home: "/",
            Posts: "/posts",
        })

        expect(matchUrl("/")).toMatchObject({ name: "Home" })
        expect(matchUrl("/posts")).toMatchObject({ name: "Posts" })
        expect(matchUrl("/posts/")).toMatchObject({ name: "Posts" })
    })

    it("should respect origin matching from patterns", () => {
        const matchUrl = urlMatcher({
            LocalOnly: "http://localhost/admin",
            AnyOrigin: "/public",
        })

        expect(matchUrl("http://localhost/admin")).toMatchObject({
            name: "LocalOnly",
        })

        expect(matchUrl("http://example.com/admin")).toBeUndefined()

        expect(matchUrl("http://localhost/public")).toMatchObject({
            name: "AnyOrigin",
        })

        expect(matchUrl("http://example.com/public")).toMatchObject({
            name: "AnyOrigin",
        })
    })
})
