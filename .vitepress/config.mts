import { defineConfig } from 'vitepress'

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
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/introduction/getting-started' },
          { text: 'Errors', link: '/introduction/errors' },
          { text: 'Not Included', link: '/introduction/not-included' },
          { text: 'Version History', link: '/versionlog/versions' },
        ],
      },
      {
        text: 'Authentication',
        items: [
          { text: 'Signing Up Users', link: '/authentication/signup' },
          { text: 'Login / Logout', link: '/authentication/login' },
          { text: 'Two-Step Login (MFA)', link: '/authentication/mfa' },
          { text: 'User Profile', link: '/authentication/profile' },
          { text: 'Passwords', link: '/authentication/password' },
          { text: 'E-Mail Verification', link: '/authentication/email-verification' },
          { text: 'OpenID Login', link: '/authentication/openid' },
          { text: 'Anonymous Login', link: '/authentication/anonymous' },
        ],
      },
      {
        text: 'Database',
        items: [
          { text: 'Tables and Access Groups', link: '/database/introduction' },
          { text: 'Creating Records', link: '/database/create' },
          { text: 'Fetching Records', link: '/database/fetch' },
          { text: 'Updating and Deleting', link: '/database/update-delete' },
          { text: 'Indexes, Tags and Unique IDs', link: '/database/index-tags' },
          { text: 'References', link: '/database/reference' },
          { text: 'Files', link: '/database/files' },
          { text: 'Private Records', link: '/database/private' },
          { text: 'Encrypting Private Data', link: '/database/encryption' },
        ],
      },
      {
        text: 'Users',
        items: [
          { text: 'Searching Users', link: '/users/search' },
          { text: 'Subscriptions and Feed', link: '/users/subscriptions' },
          { text: 'Newsletters', link: '/users/newsletters' },
          { text: 'Inquiries', link: '/users/inquiry' },
        ],
      },
      {
        text: 'Realtime',
        items: [
          { text: 'Connecting', link: '/realtime/connecting' },
          { text: 'Groups and Messages', link: '/realtime/groups' },
        ],
      },
      {
        text: 'API Bridge',
        items: [
          { text: 'Forwarding Requests', link: '/api-bridge/forward-request' },
        ],
      },
      {
        text: 'Tickets',
        items: [
          { text: 'Tickets', link: '/tickets/tickets' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api-reference/' },
          { text: 'Connection', link: '/api-reference/connection' },
          { text: 'Authentication', link: '/api-reference/authentication' },
          { text: 'Database', link: '/api-reference/database' },
          { text: 'Encryption', link: '/api-reference/encryption' },
          { text: 'Users', link: '/api-reference/users' },
          { text: 'Realtime', link: '/api-reference/realtime' },
          { text: 'API Bridge', link: '/api-reference/api-bridge' },
          { text: 'Tickets', link: '/api-reference/tickets' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/broadwayinc/skapi-swift' }],
    footer: { message: 'skapi-swift 2.4.4', copyright: 'broadway Inc.' },
  },
  vite: {
    server: {
      allowedHosts: ['seoul.broadwayinc.computer', 'us.broadwayinc.computer', 'us-dev.broadwayinc.computer', 'dev.broadwayinc.computer'],
    },
  },
})
