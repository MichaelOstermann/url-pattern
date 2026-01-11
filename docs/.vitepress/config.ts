import { defineConfig } from "vitepress"
import { groupIconMdPlugin, groupIconVitePlugin } from "vitepress-plugin-group-icons"

export default defineConfig({
    base: "/url-pattern/",
    description: "Type-safe url pattern matching.",
    title: "url-pattern",
    markdown: {
        theme: {
            dark: "catppuccin-macchiato",
            light: "github-light-default",
        },
        config(md) {
            md.use(groupIconMdPlugin)
        },
    },
    themeConfig: {
        aside: false,
        outline: "deep",
        docFooter: {
            next: false,
            prev: false,
        },
        search: {
            provider: "local",
        },
        sidebar: [
            { link: "urlPattern", text: "urlPattern" },
            { link: "urlMatcher", text: "urlMatcher" },
        ],
        socialLinks: [
            { icon: "github", link: "https://github.com/MichaelOstermann/url-pattern" },
        ],
    },
    vite: {
        plugins: [
            groupIconVitePlugin(),
        ],
    },
})
