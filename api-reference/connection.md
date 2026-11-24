# Connection

## Skapi

```swift
import Skapi

let skapi = try Skapi(projectId: String, storage: SkapiStorage? = nil, timeout: TimeInterval = 120, targetCDN: String? = nil,
                      encryption: EncryptionOptions? = nil, urlSession: URLSession = .shared, observeAppLifecycle: Bool = true)
```

| argument | |
|---|---|
| `projectId` | the Project ID from your project's Settings page on skapi.com |
| `storage` | where the signed-in session is kept between launches. Left out: the Keychain on iOS and macOS (one Keychain service per project), memory elsewhere. `MemoryStorage()` forgets the session when the object goes away. See [Storage](#storage) and [Keeping users signed in](/introduction/getting-started#keeping-users-signed-in). |
| `timeout` | seconds a request may go with nothing moving before it fails. An upload that keeps moving is never cut off |
| `targetCDN` | leave it out. The CDN the project's endpoint list is read from. |
| `encryption` | `EncryptionOptions()` or your own options: encrypts the data of private records on this device before upload. See [EncryptionOptions](/api-reference/encryption#encryptionoptions). |
| `urlSession` | the `URLSession` requests go through |
| `observeAppLifecycle` | `true`: when the app comes back to the foreground or the network returns, a dropped realtime connection reconnects at once and an anonymous account is checked. `false`: call [appDidReturn()](#appdidreturn) yourself. See [App lifecycle](/introduction/getting-started#app-lifecycle). |

The initializer only checks the Project ID: the object connects on its first call.

Properties:

| property | |
|---|---|
| `projectId`, `service`, `owner` | the project, read without `await` |
| `version` | `"2.5.0"`, read without `await` |
| `await skapi.user` | the signed-in profile (`JSON?`), see [user](/api-reference/authentication#user) |
| `await skapi.session` | the tokens (`SkapiSession?`): `.idToken.jwtToken`, `.accessToken.jwtToken`, `.refreshToken` |
| `await skapi.connection` | the last connection info from the server (`JSONObject?`) |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Project ID is required.` / `Project ID is invalid.` |
| `INVALID_PARAMETER` | `"encryption.iterations" must be at least 100000.` |
| `NOT_EXISTS` | `The project ID does not exist. Create your project from skapi.com` (thrown by the first call) |

## getConnectionInfo

```swift
func getConnectionInfo(refresh: Bool = false) async throws -> JSON
```

The project's name and settings, and the caller as the server sees it. `refresh: true` asks the server again instead of using the answer from the first call.

```json
{
    "project_id": "...",
    "user_ip": "203.0.113.7",
    "user_agent": "MyApp/1 CFNetwork/1490.0.4 Darwin/23.2.0",
    "user_location": "KR",
    "service_name": "My Project",
    "version": "2.5.0",
    "ai_agent": null,
    "conf": {"prevent_signup": false, "require_login": false, "anonymous_login": false, ...},
    "encryption_recovery": {"code": null, "message": "..."}
}
```

`"encryption_recovery"` is there only with encryption on and a signed-in user. It holds the user's encryption recovery code on the first call after it was created (their first password login with encryption on), and `null` after that, with a `"message"` saying what to do. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).

## appDidReturn

```swift
func appDidReturn() async
```

Call it when your app comes back to the foreground, if you made the object with `observeAppLifecycle: false`; otherwise it runs on its own. A realtime connection that died meanwhile reconnects at once, one that looks open is asked whether it is alive, and an [anonymous](/authentication/anonymous) account is checked so a deleted one is signed out right away. See [App lifecycle](/introduction/getting-started#app-lifecycle).

```swift
// SwiftUI
.onChange(of: scenePhase) { phase in
    if phase == .active { Task { await skapi.appDidReturn() } }
}
```

## Storage

```swift
protocol SkapiStorage: AnyObject, Sendable {
    func getItem(_ key: String) -> String?
    func setItem(_ key: String, _ value: String)
    func removeItem(_ key: String)
}
```

Where the signed-in session is kept. skapi-swift stores the same keys skapi-js keeps in `localStorage` (the user's ID, access and refresh tokens). Logging out removes them.

| type | |
|---|---|
| `KeychainStorage(service: String, accessGroup: String? = nil, thisDeviceOnly: Bool = false)` | The Keychain, one generic password item per key under `service`. The default on iOS and macOS, with the service `"skapi.session.<service id>"`. `accessGroup` shares the session with your app extensions; `thisDeviceOnly: true` keeps the items out of backups and off other devices. Items stay readable after the first unlock, so a token refresh can run in the background. |
| `MemoryStorage()` | Kept for the life of the `Skapi` object only. The default on other platforms. |
| `FileStorage(path: String)` / `FileStorage(url: URL)` | One JSON file, created readable by the current user only (mode 600). For command line tools on macOS and Linux. |
| your own type | Any class conforming to `SkapiStorage`, for example to keep sessions in your own encrypted database. |

```swift
let skapi = try Skapi(projectId: "<Project ID>",
                      storage: KeychainStorage(service: "skapi.session", accessGroup: "ABCDE12345.com.example.shared"))
```

## FetchOptions

```swift
struct FetchOptions {
    init(limit: Int? = nil, fetchMore: Bool = false, ascending: Bool? = nil, startKey: JSON? = nil)
}
```

Paging for every method that takes `fetchOptions:`. See [Paging](/database/fetch#paging).

| field | |
|---|---|
| `limit` | Records per call, up to 1000. The server's default is 50. |
| `fetchMore` | `false` (default) starts from the first page. `true` reads the page after the last one this object fetched for the same query. |
| `ascending` | `true` oldest (or smallest) first, `false` the reverse. Left out: the method's default. |
| `startKey` | Start from this key, taken from an earlier answer, or `"start"` / `"end"`. |

Methods that take it return `{"list": [...], "startKey": ..., "endOfList": Bool, "startKeyHistory": [...]}`.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Fetch limit should be below 1000.` |
| `INVALID_PARAMETER` | `"<value>" is invalid startKey key.` |

## JSON

```swift
enum JSON {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSON])
    case object(JSONObject)
}
```

Record data, queries, configs and answers are all `JSON` values, with the same keys skapi-js uses. See [JSON values](/introduction/getting-started#json-values).

Writing:

- Literals work: `["table": ["name": "posts", "access_group": "public"], "limit": 10, "tags": ["a", "b"]]`. `nil` inside a literal is `.null`.
- From variables: `.string(title)`, `.number(Double(count))`, `.bool(flag)`, or `JSON(title)`, `JSON(count)`, `JSON(flag)`, `JSON(optionalString)` (`nil` becomes `.null`).
- `json["key"] = value` sets a member of an object; setting `nil` removes it.

Reading:

| member | |
|---|---|
| `json["key"]` | a member of an object, `JSON?` |
| `json[0]` | an element of an array, `JSON?` |
| `.string`, `.bool`, `.number`, `.array`, `.object` | the value, or `nil` for another type |
| `.int` | a number that is a whole number, as `Int` |
| `.isNull` | `true` for `.null` |
| `.jsonString` | compact JSON text |
| `JSON.parse(_ text: String)` / `JSON.parse(_ data: Data)` | parses JSON text; object keys keep their order |

```swift
let title = record["data"]?["title"]?.string ?? ""
let views = record["data"]?["views"]?.int ?? 0
```

Codable:

```swift
struct Post: Codable { var title: String; var body: String }

let data = try JSON(encoding: Post(title: "Hello", body: "Hi"))
let post = try record["data"]!.decode(Post.self)
```

`JSONObject` is an object whose keys keep the order they were written in, so a value serializes the way skapi-js would write it. It has `keys`, `values`, `count`, `isEmpty`, `contains(_:)`, `removeValue(forKey:)`, a `key` subscript and `dictionary` (a plain `[String: JSON]`, order lost). Numbers are `Double`, as in JavaScript.

## SkapiError

```swift
struct SkapiError: Error {
    let code: String
    let message: String
    let cause: Any?
}
```

Every error the SDK throws. `code` is a short name such as `INVALID_PARAMETER`, `message` says what went wrong in plain words, and `cause` is the underlying error when there is one. For a refused [ticket](/tickets/tickets#when-a-consumption-fails), `cause` is the whole error body as `JSON`:

```swift
do {
    _ = try await skapi.consumeTicket(ticketId: "launch-coupon", method: "GET", data: ["code": "WRONG"])
} catch let err as SkapiError {
    print(err.code, err.message)
    print((err.cause as? JSON)?["stage"]?.string ?? "")
}
```

`String(describing: err)` and `err.localizedDescription` read `"<code>: <message>"`. The codes are listed in [Errors](/introduction/errors).
