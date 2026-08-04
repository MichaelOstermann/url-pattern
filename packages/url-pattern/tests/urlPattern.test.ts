/* eslint-disable perfectionist/sort-objects */
import { describe, expect, it } from "vitest"
import { urlPattern } from "../src/urlPattern"

const empty = {}

describe("urlPattern", () => {
    describe("Protocol matching", () => {
        it("should only match the declared protocol", () => {
            const matchPattern = urlPattern("http://foo.com/:bar")

            expect(matchPattern("http://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("https://foo.com/1")).toBeUndefined()
            expect(matchPattern("miko://foo.com/1")).toBeUndefined()
        })

        it("should match protocols case insensitively", () => {
            const matchPattern = urlPattern("miko://:workspaceId/task/:taskId")

            expect(matchPattern("miko://ws1/task/t1")).toEqual({ workspaceId: "ws1", taskId: "t1" })
            expect(matchPattern("MIKO://ws1/task/t1")).toEqual({ workspaceId: "ws1", taskId: "t1" })
            expect(matchPattern("Miko://ws1/task/t1")).toEqual({ workspaceId: "ws1", taskId: "t1" })
        })

        it("should match an uppercase protocol in the pattern", () => {
            const matchPattern = urlPattern("MIKO://ws/x")

            expect(matchPattern("miko://ws/x")).toEqual(empty)
        })

        it("should match any protocol with *", () => {
            const matchPattern = urlPattern("*://foo.com/:bar")

            expect(matchPattern("http://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("https://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("miko://foo.com/1")).toEqual({ bar: "1" })
        })

        it("should match a union of protocols", () => {
            const matchPattern = urlPattern("{http|https}://foo.com/:bar")

            expect(matchPattern("http://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("https://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("HTTPS://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("miko://foo.com/1")).toBeUndefined()
        })

        it("should capture the protocol as a parameter", () => {
            const matchPattern = urlPattern(":protocol://foo.com/:bar")

            expect(matchPattern("https://foo.com/1")).toEqual({ protocol: "https", bar: "1" })
            expect(matchPattern("MIKO://foo.com/1")).toEqual({ protocol: "miko", bar: "1" })
        })

        it("should never match an empty protocol", () => {
            const matchPattern = urlPattern("://foo.com/x")

            expect(matchPattern("http://foo.com/x")).toBeUndefined()
            expect(matchPattern("://foo.com/x")).toBeUndefined()
        })
    })

    describe("Host matching", () => {
        it("should only match the declared host", () => {
            const matchPattern = urlPattern("http://foo.com/:bar")

            expect(matchPattern("http://foo.com/1")).toEqual({ bar: "1" })
            expect(matchPattern("http://bar.com/1")).toBeUndefined()
            expect(matchPattern("http://sub.foo.com/1")).toBeUndefined()
            expect(matchPattern("http://foo.com.evil.com/1")).toBeUndefined()
        })

        it("should match hosts case insensitively", () => {
            const matchPattern = urlPattern("miko://workspace/task/:id")

            expect(matchPattern("miko://workspace/task/1")).toEqual({ id: "1" })
            expect(matchPattern("miko://WORKSPACE/task/1")).toEqual({ id: "1" })
        })

        it("should match host unions case insensitively", () => {
            const matchPattern = urlPattern("https://{FOO.com|bar.com}/x")

            expect(matchPattern("https://foo.com/x")).toEqual(empty)
            expect(matchPattern("https://bar.com/x")).toEqual(empty)
            expect(matchPattern("https://baz.com/x")).toBeUndefined()
        })

        it("should capture the whole host as a parameter", () => {
            const matchPattern = urlPattern("https://:host/x")

            expect(matchPattern("https://foo.com/x")).toEqual({ host: "foo.com" })
            expect(matchPattern("https://a.b.example.com/x")).toEqual({ host: "a.b.example.com" })
        })

        it("should capture the host without the port", () => {
            const matchPattern = urlPattern("https://:host/x")

            expect(matchPattern("https://foo.com:8443/x")).toEqual({ host: "foo.com" })
        })

        it("should preserve host case when capturing custom protocols", () => {
            const matchPattern = urlPattern("miko://:workspaceId/task/:taskId")

            expect(matchPattern("miko://01KN1NN37T6D4HE94J1SADGMSR/task/t1")).toEqual({ workspaceId: "01KN1NN37T6D4HE94J1SADGMSR", taskId: "t1" })
        })

        it("should lowercase a captured host for http and https", () => {
            const matchPattern = urlPattern("*://:host/x")

            expect(matchPattern("https://01KN1NN37T6D4HE94J1SADGMSR/x")).toEqual({ host: "01kn1nn37t6d4he94j1sadgmsr" })
            expect(matchPattern("miko://01KN1NN37T6D4HE94J1SADGMSR/x")).toEqual({ host: "01KN1NN37T6D4HE94J1SADGMSR" })
        })

        it("should not decode a captured host", () => {
            const matchPattern = urlPattern("miko://:workspaceId")

            expect(matchPattern("miko://a%20b")).toEqual({ workspaceId: "a%20b" })
        })

        it("should match any host with *", () => {
            const matchPattern = urlPattern("https://*/x")

            expect(matchPattern("https://localhost/x")).toEqual(empty)
            expect(matchPattern("https://foo.com/x")).toEqual(empty)
            expect(matchPattern("https://a.b.c.example.com/x")).toEqual(empty)
        })

        it("should match ip hosts", () => {
            expect(urlPattern("http://127.0.0.1/x")("http://127.0.0.1/x")).toEqual(empty)
            expect(urlPattern("http://*/x")("http://127.0.0.1/x")).toEqual(empty)
            expect(urlPattern("http://*/x")("http://[::1]/x")).toEqual(empty)
        })

        it("should match subdomain wildcards", () => {
            const matchPattern = urlPattern("https://*.example.com/x")

            expect(matchPattern("https://foo.example.com/x")).toEqual(empty)
            expect(matchPattern("https://a.b.example.com/x")).toEqual(empty)
            expect(matchPattern("https://example.com/x")).toBeUndefined()
            expect(matchPattern("https://foo.evil.com/x")).toBeUndefined()
            expect(matchPattern("https://evil.com/foo.example.com/x")).toBeUndefined()
        })

        it("should match partial host wildcards", () => {
            const matchPattern = urlPattern("https://api.*.example.com/x")

            expect(matchPattern("https://api.eu.example.com/x")).toEqual(empty)
            expect(matchPattern("https://api.us.example.com/x")).toEqual(empty)
            expect(matchPattern("https://cdn.eu.example.com/x")).toBeUndefined()
        })

        it("should match a union of hosts", () => {
            const matchPattern = urlPattern("https://{foo.com|bar.com}/x")

            expect(matchPattern("https://foo.com/x")).toEqual(empty)
            expect(matchPattern("https://bar.com/x")).toEqual(empty)
            expect(matchPattern("https://baz.com/x")).toBeUndefined()
        })

        it("should escape dots in a literal host", () => {
            const matchPattern = urlPattern("https://foo.com/x")

            expect(matchPattern("https://fooXcom/x")).toBeUndefined()
        })

        it("should not match a trailing dot host", () => {
            expect(urlPattern("https://foo.com/x")("https://foo.com./x")).toBeUndefined()
        })

        it("should not match an empty host", () => {
            expect(urlPattern("file://:host/x")("file:///x")).toBeUndefined()
            expect(urlPattern("file://*/x")("file:///x")).toBeUndefined()
        })

        it("should check the host, not the userinfo", () => {
            const matchPattern = urlPattern("https://foo.com/x")

            expect(matchPattern("https://user:pass@foo.com/x")).toEqual(empty)
            expect(matchPattern("https://foo.com@evil.com/x")).toBeUndefined()
        })

        it("should not match urls without a hierarchical authority", () => {
            const matchPattern = urlPattern("*://:host/x")

            expect(matchPattern("mailto:a@b.com")).toBeUndefined()
            expect(matchPattern("data:text/plain,hello")).toBeUndefined()
            expect(matchPattern("about:blank")).toBeUndefined()
        })
    })

    describe("Port matching", () => {
        it("should match any port when none is declared", () => {
            const matchPattern = urlPattern("http://localhost/:id")

            expect(matchPattern("http://localhost/1")).toEqual({ id: "1" })
            expect(matchPattern("http://localhost:3000/1")).toEqual({ id: "1" })
        })

        it("should only match the declared port", () => {
            const matchPattern = urlPattern("http://foo.com:3000/:bar")

            expect(matchPattern("http://foo.com:3000/1")).toEqual({ bar: "1" })
            expect(matchPattern("http://foo.com/1")).toBeUndefined()
            expect(matchPattern("http://foo.com:4000/1")).toBeUndefined()
        })

        it("should treat default ports as absent", () => {
            expect(urlPattern("http://foo.com:80/:bar")("http://foo.com/1")).toBeUndefined()
            expect(urlPattern("http://foo.com:80/:bar")("http://foo.com:80/1")).toBeUndefined()
            expect(urlPattern("https://foo.com:443/:bar")("https://foo.com/1")).toBeUndefined()
            expect(urlPattern("https://foo.com:443/:bar")("https://foo.com:443/1")).toBeUndefined()
            expect(urlPattern("https://foo.com::port/x")("https://foo.com:443/x")).toBeUndefined()
        })

        it("should match an empty declared port against a url without a port", () => {
            const matchPattern = urlPattern("https://foo.com:/x")

            expect(matchPattern("https://foo.com/x")).toEqual(empty)
            expect(matchPattern("https://foo.com:443/x")).toEqual(empty)
            expect(matchPattern("https://foo.com:3000/x")).toBeUndefined()
        })

        it("should capture the port as a parameter", () => {
            const matchPattern = urlPattern("http://localhost::port/:id")

            expect(matchPattern("http://localhost:3000/1")).toEqual({ port: "3000", id: "1" })
            expect(matchPattern("http://localhost/1")).toBeUndefined()
        })

        it("should match a union of ports", () => {
            const matchPattern = urlPattern("http://foo.com:{3000|4000}/x")

            expect(matchPattern("http://foo.com:3000/x")).toEqual(empty)
            expect(matchPattern("http://foo.com:4000/x")).toEqual(empty)
            expect(matchPattern("http://foo.com:5000/x")).toBeUndefined()
            expect(matchPattern("http://foo.com/x")).toBeUndefined()
        })

        it("should match any present port with *", () => {
            const matchPattern = urlPattern("http://foo.com:*/x")

            expect(matchPattern("http://foo.com:3000/x")).toEqual(empty)
            expect(matchPattern("http://foo.com/x")).toBeUndefined()
        })

        it("should combine a host parameter with a port", () => {
            const matchPattern = urlPattern("http://:host:3000/:id")

            expect(matchPattern("http://foo.com:3000/1")).toEqual({ host: "foo.com", id: "1" })
            expect(matchPattern("http://foo.com:4000/1")).toBeUndefined()
        })
    })

    describe("Path matching", () => {
        it("should match paths under an origin", () => {
            const matchPattern = urlPattern("https://foo.com/posts/:id")

            expect(matchPattern("https://foo.com/posts/1")).toEqual({ id: "1" })
            expect(matchPattern("https://foo.com/posts")).toBeUndefined()
            expect(matchPattern("https://foo.com/posts/1/2")).toBeUndefined()
        })

        it("should match an empty path", () => {
            const matchPattern = urlPattern("https://foo.com")

            expect(matchPattern("https://foo.com")).toEqual(empty)
            expect(matchPattern("https://foo.com/")).toEqual(empty)
            expect(matchPattern("https://foo.com/x")).toBeUndefined()
        })

        it("should ignore a trailing slash in the pattern", () => {
            const matchPattern = urlPattern("https://foo.com/")

            expect(matchPattern("https://foo.com")).toEqual(empty)
            expect(matchPattern("https://foo.com/")).toEqual(empty)
        })

        it("should match paths case sensitively", () => {
            expect(urlPattern("https://foo.com/X")("https://foo.com/x")).toBeUndefined()
        })

        it("should support the full path syntax", () => {
            expect(urlPattern("https://foo.com/a/**/b")("https://foo.com/a/x/y/b")).toEqual(empty)
            expect(urlPattern("https://foo.com/a/**/b")("https://foo.com/a/b")).toBeUndefined()
            expect(urlPattern("https://foo.com/a/*/b")("https://foo.com/a/x/b")).toEqual(empty)
            expect(urlPattern("https://foo.com/{a|b}")("https://foo.com/b")).toEqual(empty)
            expect(urlPattern("miko://ws/**")("miko://ws/a/b")).toEqual(empty)
            expect(urlPattern("https://foo.com/:id{a|b}")("https://foo.com/a")).toEqual({ id: "a" })
        })

        it("should decode path parameters", () => {
            expect(urlPattern("miko://ws/:id")("miko://ws/a%20b")).toEqual({ id: "a b" })
        })

        it("should ignore the hash of a url", () => {
            expect(urlPattern("https://foo.com/x")("https://foo.com/x#top")).toEqual(empty)
        })

        it("should reject patterns declaring a hash", () => {
            expect(() => urlPattern("miko://ws/x#frag")).toThrow(/hashes are never matched/)
        })
    })

    describe("Deep links", () => {
        it("should match a custom protocol deep link", () => {
            const matchPattern = urlPattern("miko://:workspaceId/task/:taskId")

            expect(matchPattern("miko://ws1/task/t1")).toEqual({ workspaceId: "ws1", taskId: "t1" })
        })

        it("should not match foreign origins with the same path shape", () => {
            const matchPattern = urlPattern("miko://:workspaceId/task/:taskId")

            expect(matchPattern("https://evil.example.com/ws1/task/t1")).toBeUndefined()
            expect(matchPattern("http://evil.example.com/ws1/task/t1")).toBeUndefined()
            expect(matchPattern("evil://ws1/task/t1")).toBeUndefined()
            expect(matchPattern("file:///ws1/task/t1")).toBeUndefined()
            expect(matchPattern("mikox://ws1/task/t1")).toBeUndefined()
        })

        it("should not confuse route shapes across protocols", () => {
            const deepLink = urlPattern("miko://:workspaceId/library")
            const workspace = urlPattern("miko://:workspaceId")

            expect(deepLink("miko://ws1/library")).toEqual({ workspaceId: "ws1" })
            expect(workspace("miko://ws1/library")).toBeUndefined()
            expect(workspace("miko://ws1")).toEqual({ workspaceId: "ws1" })
            expect(workspace("miko://ws1/")).toEqual({ workspaceId: "ws1" })
        })

        it("should require a host for a bare custom protocol", () => {
            expect(urlPattern("miko://:workspaceId")("miko://")).toBeUndefined()
        })

        it("should never match a url without an origin", () => {
            expect(urlPattern("http://localhost/x")("/x")).toBeUndefined()
            expect(urlPattern("http://localhost/x")("//localhost/x")).toBeUndefined()
            expect(urlPattern("https://foo.com/x")("/x")).toBeUndefined()
            expect(urlPattern("miko://ws/x")("/x")).toBeUndefined()
            expect(urlPattern("miko://ws/x")("ws/x")).toBeUndefined()
        })
    })

    describe("Invalid input", () => {
        it("should return undefined instead of throwing on unparseable urls", () => {
            const matchPattern = urlPattern("miko://:workspaceId/task/:taskId")

            expect(matchPattern("miko:///")).toBeUndefined()
            expect(matchPattern("//")).toBeUndefined()
            expect(matchPattern("")).toBeUndefined()
            expect(matchPattern("not a url")).toBeUndefined()
        })

        it("should pass the host through verbatim", () => {
            const matchPattern = urlPattern("miko://:workspaceId")

            expect(matchPattern("miko://%%%")).toEqual({ workspaceId: "%%%" })
        })

        it("should return undefined instead of throwing on malformed path escapes", () => {
            const matchPattern = urlPattern("miko://ws/task/:id")

            expect(matchPattern("miko://ws/task/%E0%A4%A")).toBeUndefined()
            expect(matchPattern("miko://ws/task/%%%")).toBeUndefined()
        })

        it("should not throw for any launch url shape", () => {
            const matchPattern = urlPattern("miko://:workspaceId/task/:taskId")
            const urls = ["miko:///", "miko://%%%", "miko://", "miko://a/b/c/d/e", "//", "", "%", "::::", "not a url", "data:text/plain,x", "mailto:a@b.com", "file:///a", "?", "#"]

            for (const url of urls) {
                expect(() => matchPattern(url)).not.toThrow()
            }
        })
    })

    describe("Invalid patterns", () => {
        it("should throw when no protocol is given", () => {
            // @ts-expect-error - urlPattern requires a protocol and a host.
            expect(() => urlPattern("/posts/:id")).toThrow(/did you mean pathPattern/)
            // @ts-expect-error - urlPattern requires a protocol and a host.
            expect(() => urlPattern("foo.com/posts")).toThrow(/did you mean pathPattern/)
            // @ts-expect-error - urlPattern requires a protocol and a host.
            expect(() => urlPattern("")).toThrow(/did you mean pathPattern/)
        })

        it("should throw when the authority is empty", () => {
            expect(() => urlPattern("https:///posts")).toThrow(/malformed authority/)
        })

        it("should throw on unbalanced braces", () => {
            expect(() => urlPattern("https://foo.com/a{b/c")).toThrow(/unbalanced braces/)
            expect(() => urlPattern("https://foo.com{/x")).toThrow(/unbalanced braces/)
        })

        it("should throw on empty alternatives", () => {
            expect(() => urlPattern("https://{foo.com|}/x")).toThrow(/empty alternative/)
            expect(() => urlPattern("{http|}://foo.com/x")).toThrow(/empty alternative/)
        })

        it("should throw when a parameter is not the whole group", () => {
            expect(() => urlPattern("https://:env{eu|us}.example.com/x")).toThrow(/malformed parameter/)
            expect(() => urlPattern("https://foo.com/:id*")).toThrow(/malformed parameter/)
        })

        it("should throw on patterns declaring search parameters", () => {
            expect(() => urlPattern("https://foo.com/x?a")).toThrow(/search parameters are never matched/)
        })

        it("should throw on an ipv6 authority", () => {
            expect(() => urlPattern("http://[::1]:3000/x")).toThrow(/ipv6 hosts are not supported/)
            expect(() => urlPattern("http://[::1]/x")).toThrow(/ipv6 hosts are not supported/)
        })

        it("should throw when the pattern declares userinfo", () => {
            expect(() => urlPattern("https://user@foo.com/x")).toThrow(/not by userinfo/)
            expect(() => urlPattern("https://user:pass@foo.com/x")).toThrow(/not by userinfo/)
        })

        it("should allow an at sign in the path", () => {
            expect(urlPattern("https://foo.com/@michael")("https://foo.com/@michael")).toEqual(empty)
            expect(urlPattern("https://foo.com/@/:handle")("https://foo.com/@/michael")).toEqual({ handle: "michael" })
        })

        it("should name the offending pattern in the error", () => {
            expect(() => urlPattern("https:///posts")).toThrow(/Invalid pattern "https:\/\/\/posts"/)
        })
    })

    describe("Reuse", () => {
        it("should return an independent result for every call", () => {
            const matchPattern = urlPattern("miko://:ws/task/:id")
            const first = matchPattern("miko://a/task/1")!
            const second = matchPattern("miko://b/task/2")!

            expect(first).toEqual({ ws: "a", id: "1" })
            expect(second).toEqual({ ws: "b", id: "2" })
            expect(first).not.toBe(second)
        })

        it("should give the same answer when called repeatedly", () => {
            const matchPattern = urlPattern("miko://:ws/task/:id")

            for (let i = 0; i < 3; i++) {
                expect(matchPattern("miko://ws1/task/t1")).toEqual({ ws: "ws1", id: "t1" })
                expect(matchPattern("https://evil.com/ws1/task/t1")).toBeUndefined()
            }
        })
    })
})
