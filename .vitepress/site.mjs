// This site's identity and sidebar, shared by .vitepress/config.mts (the website) and
// agent-docs.mjs (the base prompt SKAPI.md, md/<page>.md and llms.txt for AI agents).

/** Where the site is served. */
export const ORIGIN = 'https://ios.skapi.com'
/** The id of this SDK in sdk-platforms.mjs. */
export const SDK_ID = 'swift'
/** The SDK's package name, as the base prompt names it. */
export const SDK_NAME = 'skapi-swift'
export const SITE_TITLE = 'Skapi for Swift'

export const sidebar = [
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
]
