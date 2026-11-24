import { defineConfig } from 'vitepress'
import { sidebar } from './site.mjs'

// skapi-swift documentation: the Skapi API for iOS and macOS. Compact on purpose: only the methods
// skapi-swift provides (accounts, sign-in, database, files, users, realtime, API bridge, tickets).
// Browser, dashboard, admin and hosting features live in the skapi-js documentation.
export default defineConfig({
  title: 'Skapi for Swift',
  description: 'Skapi backend for iOS and macOS. Sign users in and use your project database.',
  lang: 'en-US',
  cleanUrls: false,
  lastUpdated: false,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
  ],
  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'Skapi Swift',
    search: { provider: 'local' },
    nav: [
      { text: 'Getting Started', link: '/introduction/getting-started' },
      { text: 'API Reference', link: '/api-reference/' },
      { text: 'Version History', link: '/versionlog/versions' },
      { text: 'skapi.com', link: 'https://www.skapi.com' },
    ],
    sidebar,
    socialLinks: [{ icon: 'github', link: 'https://github.com/broadwayinc/skapi-swift' }],
    footer: { message: 'skapi-swift 2.5.0', copyright: 'broadway Inc.' },
  },
  vite: {
    server: {
      allowedHosts: ['seoul.broadwayinc.computer', 'us.broadwayinc.computer', 'us-dev.broadwayinc.computer', 'dev.broadwayinc.computer'],
    },
  },
})
