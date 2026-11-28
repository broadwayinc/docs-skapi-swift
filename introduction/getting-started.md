# Getting Started

skapi-swift is the Skapi API for iOS and macOS. It signs users in, keeps their sessions in the Keychain, and reads and writes your project's database, with the same queries, answers and error codes as [skapi-js](https://docs.skapi.com). Use it in SwiftUI and UIKit apps, Mac apps and command line tools. A user who signs up in your web app signs in to your iOS app with the same account.

## Requirements

- iOS 15 or macOS 12, and Swift 5.9 or later (Xcode 15 or later).
- No third-party packages on Apple platforms: skapi-swift uses only Foundation and the system frameworks (CryptoKit, CommonCrypto, Security). On Linux it links `swift-crypto` in place of CryptoKit.
- A Skapi project. Create one on [skapi.com](https://www.skapi.com) and copy its **Project ID** from the project's **Settings** page.

## Install

In Xcode, choose **File > Add Package Dependencies**, enter the package URL below, and add the **Skapi** library to your app target.

```
https://github.com/broadwayinc/skapi-swift.git
```

With a `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/broadwayinc/skapi-swift.git", from: "2.7.0"),
],
targets: [
    .target(name: "MyApp", dependencies: [.product(name: "Skapi", package: "skapi-swift")]),
]
```

## Connect to your project

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let info = try await skapi.getConnectionInfo()
print(info["service_name"]?.string ?? "")  // your project's name
```

One `Skapi` object works with one project. It connects on its first call, not when it is created. Creating it throws `INVALID_PARAMETER` only when the Project ID is empty or invalid, or an option is out of range.

The examples in these pages run inside an `async throws` function, or a `Task { ... }` with a `do`/`catch`, and use the `skapi` object made above.

## Your first records

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

// sign in (create the account first with skapi.signup(), see Signing Up Users)
try await skapi.login(email: "user@example.com", password: "password")

// write a record
let record = try await skapi.postRecord(
    ["title": "Hello", "body": "My first record"],
    config: ["table": ["name": "posts", "access_group": "public"]]
)
print(record["record_id"]?.string ?? "")

// read records back
let result = try await skapi.getRecords(["table": ["name": "posts", "access_group": "public"]])
for post in result["list"]?.array ?? [] {
    print(post["data"]?["title"]?.string ?? "")
}
```

## Names in Swift

Methods have the same names as in skapi-js, with Swift argument labels. Everything you pass in a query or config uses the same keys as skapi-js, so a query reads the same in both:

| skapi-js | skapi-swift |
|---|---|
| `skapi.getRecords({ table: { name: 'posts', access_group: 'public' } })` | `try await skapi.getRecords(["table": ["name": "posts", "access_group": "public"]])` |
| `skapi.postRecord(data, config)` | `try await skapi.postRecord(data, config: config)` |
| `skapi.login({ email, password })` | `try await skapi.login(email: email, password: password)` |
| `skapi.getRecords(query, { limit: 20 })` | `try await skapi.getRecords(query, fetchOptions: FetchOptions(limit: 20))` |

Answers have the same keys skapi-js returns, as [`JSON`](#json-values) values.

## JSON values

Record data, queries, configs and answers are `JSON` values: an enum with the cases `.null`, `.bool`, `.number` (a `Double`), `.string`, `.array` and `.object`. Write them as literals:

```swift
let data: JSON = ["title": "Hello", "tags": ["a", "b"], "views": 0, "draft": false]
```

A variable goes in with its case, or through `JSON(...)`:

```swift
let title = "Hello"
let recordId = record["record_id"]?.string ?? ""

let data: JSON = ["title": .string(title), "count": JSON(3)]
let config: JSON = ["record_id": .string(recordId)]
```

Read values back with a subscript and a typed reader. Each step returns an optional, so a missing key reads as `nil`:

```swift
record["data"]?["title"]?.string     // String?
record["data"]?["views"]?.int        // Int?  (numbers are Double; .int reads a whole number)
record["data"]?["views"]?.number     // Double?
record["readonly"]?.bool             // Bool?
record["tags"]?.array                // [JSON]?
record["table"]?.object              // JSONObject?
result["list"]?[0]                   // the first element of an array
record["reference"]?.isNull          // true for null
```

Objects keep their keys in the order they were written, the way JavaScript objects do. `jsonString` gives compact JSON text and `JSON.parse(_:)` reads it back.

### Codable types

Your own `Codable` types convert both ways:

```swift
struct Post: Codable {
    var title: String
    var body: String
}

let saved = try await skapi.postRecord(
    try JSON(encoding: Post(title: "Hello", body: "My first record")),
    config: ["table": ["name": "posts", "access_group": "public"]]
)
let post = try saved["data"]?.decode(Post.self)
```

## Keeping users signed in

On iOS and macOS the session is kept in the Keychain by default, one Keychain service per project. When the app launches again, the user is still signed in:

```swift
let skapi = try Skapi(projectId: "<Project ID>")

if await skapi.user == nil {          // signed in from the Keychain when it holds a session
    try await skapi.login(email: "user@example.com", password: "password")
}
```

Pass another `storage` to keep it somewhere else:

| storage | where the session lives |
|---|---|
| left out | the Keychain (`KeychainStorage`), on iOS and macOS |
| `MemoryStorage()` | memory only: the session ends with the `Skapi` object |
| `FileStorage(path: "~/.myapp/session.json")` | a JSON file readable by you only, for command line tools |
| `KeychainStorage(service: "...", accessGroup: "...")` | a shared Keychain access group, to share the session with your app extensions |
| your own type | any class conforming to `SkapiStorage` |

```swift
final class MyStorage: SkapiStorage, @unchecked Sendable {
    func getItem(_ key: String) -> String? { /* read */ nil }
    func setItem(_ key: String, _ value: String) { /* write */ }
    func removeItem(_ key: String) { /* delete */ }
}

let skapi = try Skapi(projectId: "<Project ID>", storage: MyStorage())
```

The stored items are the user's tokens. Logging out removes them.

## Options

```swift
try Skapi(projectId: String, storage: SkapiStorage? = nil, timeout: TimeInterval = 120, targetCDN: String? = nil,
          encryption: EncryptionOptions? = nil, urlSession: URLSession = .shared, observeAppLifecycle: Bool = true)
```

| option | default | what it does |
|---|---|---|
| `storage` | the Keychain | where the signed-in session is kept, see above |
| `timeout` | `120` | seconds a request may go with nothing moving before it fails. An upload that keeps moving is never cut off |
| `targetCDN` | | leave it out: where the project's endpoint list is read from |
| `encryption` | `nil` (off) | encrypts the data of private records on the device, see [Encrypting Private Data](/database/encryption) |
| `urlSession` | `.shared` | the `URLSession` requests go through |
| `observeAppLifecycle` | `true` | reacts when the app returns to the foreground or the network comes back, see below |

## Concurrency

`Skapi` is an actor. Every method is `async`, and calls from many tasks at once are safe. Reading `user` and `session` needs `await` too; `projectId`, `service`, `owner` and `version` do not.

A `Skapi` object holds one signed-in user. In an app, make one object and share it, for example in your app's model or environment:

```swift
@MainActor
final class AppModel: ObservableObject {
    let skapi = try! Skapi(projectId: "<Project ID>")
    @Published var userName = ""

    func signIn(email: String, password: String) async {
        do {
            let user = try await skapi.login(email: email, password: password)
            userName = user["name"]?.string ?? ""
        } catch let err as SkapiError {
            print(err.code, err.message)
        } catch {
            print(error)
        }
    }
}
```

A program that signs in more than one user at once needs one object per user, each with its own `storage`.

## App lifecycle

With `observeAppLifecycle` on (the default), skapi-swift watches for the app returning to the foreground and for the network coming back, as skapi-js does with a browser tab becoming visible again. When either happens:

- a [realtime connection](/realtime/connecting) that died meanwhile reconnects at once, and one that looks open is asked whether it is still alive;
- an [anonymous account](/authentication/anonymous) is checked, so one that was deleted while the app was away is signed out right away.

If you pass `observeAppLifecycle: false`, call `appDidReturn()` yourself when your app becomes active:

```swift
.onChange(of: scenePhase) { phase in
    if phase == .active {
        Task { await skapi.appDidReturn() }
    }
}
```

## Building With Your AI Agent

An AI coding agent can write your skapi-swift app. Give it Skapi's base prompt for skapi-swift:

- **[SKAPI.md](https://ios.skapi.com/SKAPI.md)** (<a href="/SKAPI.md" download="SKAPI.md">download</a>): the rules for building an iOS or macOS app, a map of this documentation and an index of every skapi-swift method. Each entry links to its page under `https://ios.skapi.com/md/` (every page of this site as raw markdown), and the agent opens a page when it builds that feature, so it needs to be able to open public web pages.

To use it:

1. Download the file.
2. Save it in your project folder under the name your agent reads (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md` ...), or attach it to your chat.
3. Ask the agent to use it as its base prompt, with your Project ID:

```text
Use SKAPI.md as your base prompt.
My Skapi project ID is "<Project ID>".
Build me a [describe what you want].
```

With the [Skapi MCP server](https://mcp.skapi.com) connected, the agent can also create a project, register Secret Keys and Tickets, and read this documentation through its `readDocs` tool.

The Skapi MCP server's address is **https://mcp.skapi.com**. Add it to your AI app as a remote MCP server and sign in with your Skapi account. The steps for each AI app are in the [Skapi MCP guide](https://mcp.skapi.com/#connect).

## Next

- [Signing Up Users](/authentication/signup) and [Login / Logout](/authentication/login)
- [Tables and Access Groups](/database/introduction)
- [Errors](/introduction/errors)
- [Not Included](/introduction/not-included): what skapi-js has that this SDK leaves out
