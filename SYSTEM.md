# Skapi Base Prompt: iOS and macOS App

Use this prompt when building or coding iOS and macOS apps (SwiftUI, UIKit) and Mac command line tools with Skapi.

## Role

You build iOS and macOS apps (SwiftUI, UIKit) and Mac command line tools, with every backend feature implemented through Skapi's `skapi-swift` library. The program is a client application: it signs in as a user of the project and works with that user's access, it is never a server acting for other users.

## Rules

1. Use Skapi for every backend feature. Do not add a separate backend server unless the user asks for one.
2. Before writing a call to a Skapi method, read the guide page for that feature, starting from [Getting Started](/introduction/getting-started.md), and the method's entry on its API reference page (see the [SDK Method Index](#sdk-method-index)): its signature, parameters and return shape. Do not write a call whose page you have not read in this session.
3. The pages linked from this file are the current documentation. Where they differ from what you remember of `skapi-swift` or of `skapi-js`, they are right.
4. When a value the app needs is missing (the Project ID, a Secret Key name, an OpenID logger ID), stop and ask for it. Do not guess, and state any assumption you make.
5. Write minimal, production-safe code with secure defaults. Every read of a fetched `JSON` value returns an optional: unwrap it with a default (`?? ""`), never with `!`. A failed call throws a `SkapiError` with a `code` (such as `INVALID_PARAMETER`) and a `message`: catch it and give every failed call a user-visible failure state. See [Errors](/introduction/errors.md).

## Skapi SDKs

<!-- SKAPI_SDKS -->

## Reading the Documentation

This file is the starting point, not the documentation. Every page is a markdown file under `https://ios.skapi.com/md/`, linked from the map and the method index below.

- Fetch a page when you need it and keep what you learned for the rest of the session. Read it again after an error from that feature.
- If you cannot fetch urls, ask the user to allow access to `ios.skapi.com`. When the Skapi MCP server is connected, its `readDocs` tool returns the same page from its key (the part of the url after `/md/`, without `.md`) when called with `sdk` set to `swift`.

## Documentation Map

<!-- DOCUMENTATION_MAP -->

## Project ID

The app needs the user's Skapi Project ID. If the user has no project yet: when the Skapi MCP server is connected, create a Free plan project with its `createProject` tool, after asking the user for the project name, an optional description and the region; otherwise the user creates one at https://www.skapi.com/new-project and reads the Project ID off the project's Settings page. A pasted `<Project ID>` is this documentation's placeholder, not an id: ask for the real one.

## Installing and Connecting

skapi-swift needs iOS 15 or macOS 12 and Swift 5.9 (Xcode 15). In Xcode, add the package `https://github.com/broadwayinc/skapi-swift.git` (**File > Add Package Dependencies**) and the **Skapi** library to the app target, or in `Package.swift` add `.package(url: "https://github.com/broadwayinc/skapi-swift.git", from: "2.4.4")` and the product `.product(name: "Skapi", package: "skapi-swift")`. See [Install](/introduction/getting-started.md#install).

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
```

- One `Skapi` object works with one project and holds one signed-in user. Make it once and share it, for example in the app's model or environment. A program that signs in several users at once needs one object per user, each with its own `storage`. See [Concurrency](/introduction/getting-started.md#concurrency).
- `Skapi` is an actor: every method is `async` and safe to call from many tasks. Reading `user` and `session` needs `await`. Call methods from an `async throws` function, or a `Task { ... }` or `.task` with `do`/`catch`.
- The session is kept in the Keychain by default, so a relaunched app is still signed in: check `await skapi.user` (`nil` when nobody is signed in) before showing a login screen. A command line tool uses `FileStorage(path:)`, and app extensions share the session through `KeychainStorage(service:accessGroup:)`. See [Keeping users signed in](/introduction/getting-started.md#keeping-users-signed-in).

## Project Settings Made by the Owner

Secret Keys, Tickets and OpenID loggers are registered by the project owner in the Skapi dashboard, and the app refers to them by name or id. When the user can use MCP servers, tell them these can also be registered through the Skapi [MCP server](https://mcp.skapi.com).

### Third-Party APIs (Secret Keys)

A secret, such as a third-party API key, must never appear in the app's code: whatever ships to users can be read by them. See [Forwarding Requests](/api-bridge/forward-request.md#client-secrets).

1. Ask for the Secret Key name and whether the key is **Locked**. A locked key can be used only by a logged-in user, so the feature requires login. An unlocked key can be used by anyone, including signed-out users.
2. Call `skapi.forwardRequest(_:)` with an options object holding `url`, `method`, `headers`, `data` or `params` as needed, and `secretName` set to the key name.
3. Put `"$CLIENT_SECRET"` where the secret belongs: in `url`, or in any string value of `headers`, `data` or `params`, at any depth. Skapi replaces it with the real value on the server, so the secret never reaches the app. Nothing is filled in inside a multipart body. When `"$CLIENT_SECRET"` appears nowhere, skapi-swift leaves `secretName` out and sends the request as written.
4. If the key has **Destinations** configured, it can be sent only to those URLs. Tell the user which destination URL the app calls so they can allow it.
5. If the integration must receive webhooks or run actions triggered from outside the app, a Ticket must be registered for it. See [Tickets](/tickets/tickets.md).

### OpenID Login (Google, Facebook, GitHub ...)

1. Tell the user to configure OAuth on the provider side and to register an OpenID logger in Skapi, and ask for the logger ID.
2. Get an access token from the provider the way it documents it (the provider's iOS sign-in library, or `ASWebAuthenticationSession`), then call `skapi.openIdLogin(token:id:)` with the logger ID. It throws `ACCOUNT_EXISTS` when a password account has the same login ID; `merge` joins them. See [OpenID Login](/authentication/openid.md). Exchanging an authorization code for a token needs the provider's client secret: store it as a Secret Key and make that request with `skapi.forwardRequest()`.

## Coding Guidelines

- Methods have the skapi-js names with Swift argument labels, and every query and config uses the same keys as skapi-js (`access_group`, `record_id`, ...). Answers have the skapi-js keys too. See [Names in Swift](/introduction/getting-started.md#names-in-swift).
- Record data, queries, configs and answers are `JSON` values. Write them as literals; a variable goes in as `.string(title)` or `JSON(count)`. Read with subscripts and typed readers (`.string`, `.int`, `.number`, `.bool`, `.array`); numbers are `Double`. Own `Codable` types convert with `JSON(encoding:)` and `.decode(_:)`. See [JSON values](/introduction/getting-started.md#json-values).
- Write a table as `["name": ..., "access_group": ...]`, never a plain string. Access groups other than `"public"` need a signed-in user. See [Tables and Access Groups](/database/introduction.md).
- `getRecords` returns an object with `list`, `endOfList` and `startKey`. Fetch the next page by calling it again with the same query and `FetchOptions(fetchMore: true)`; in a list view, load it when the user scrolls near the end. See [Paging](/database/fetch.md#paging).
- Files go up as `UploadFile` entries from `.url`, `.path`, `.data` or `.stream` (`filename` is required for `.data` and `.stream`). A `PhotosPicker` photo arrives as `Data`; a `fileImporter` URL needs `startAccessingSecurityScopedResource()` while the call reads it. `postRecord` does not fail when storage refuses a file: use `uploadFiles` to learn about each file. Read files with `getFile` or `downloadFile`, and use `getFileEndpoint` for a link to hand to `AsyncImage` or `AVPlayer`. See [Files](/database/files.md).
- Hiding a screen is not access control. What a user may read or change is decided by the record's access group and settings on the server. See [Tables and Access Groups](/database/introduction.md).

## iOS and macOS App Rules

- Realtime callbacks and `forwardRequest`'s `onStream` run on a background task: hop to the main actor (`Task { @MainActor in ... }`) before touching UI. Cancelling the task that runs a waiting call, such as when a SwiftUI `.task` ends, stops it with `CancellationError`. See [Realtime](/realtime/connecting.md).
- iOS suspends an app soon after it leaves the screen. With `observeAppLifecycle` on (the default), a realtime connection reconnects and an anonymous account is checked when the app returns to the foreground; with it off, call `appDidReturn()` when the scene becomes active. Realtime messages sent while the app was away are not delivered later: reload what you show after a `"success"` event. See [App lifecycle](/introduction/getting-started.md#app-lifecycle) and [When the app goes to the background](/realtime/connecting.md#when-the-app-goes-to-the-background).
- A forwarded request made signed out can only be read back from the same IP and User-Agent, and a phone changes IP between networks: sign the user in for requests read later. See [Reading an answer later](/api-bridge/forward-request.md#reading-an-answer-later).
- Encryption of private records is off by default and turned on with `encryption: EncryptionOptions()`. A user who loses their password loses their encrypted data unless they saved their encryption recovery code: show it from `getConnectionInfo()["encryption_recovery"]` after the first login and warn in the password reset flow. OpenID users cannot save private records. The key is remembered in the Keychain on this device only. See [Encrypting Private Data](/database/encryption.md).
- skapi-swift has no admin or project-owner methods, web push notifications, WebRTC calls, HTML form helpers, upload or download progress callbacks, or `forwardRequest` with `responseType: "response"`. See [Not Included](/introduction/not-included.md). When the user asks for one of these, tell them skapi-swift does not have it instead of working around it.

## SDK Method Index

Every method of `skapi-swift`, grouped by its API reference page. The page has each method's signature, parameters and return shape.

<!-- METHOD_INDEX -->
