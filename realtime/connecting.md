# Connecting to Realtime

The realtime connection sends JSON between signed-in users as it happens: chat, live updates, presence. One `Skapi` object holds one connection, and it can be in one group at a time. It runs over `URLSessionWebSocketTask`, with nothing extra to install.

## Opening the connection

The user must be signed in (an [anonymous login](/authentication/anonymous) works too). [connectRealtime(_:)](/api-reference/realtime#connectrealtime) takes a callback and returns once the connection is open:

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
try await skapi.login(email: "user@example.com", password: "password")

try await skapi.connectRealtime { event in
    print(event.type, event.sender ?? "", event.message)
}
```

The callback runs on a background task, once for every event. To update your UI, hop to the main actor:

```swift
@MainActor
final class ChatModel: ObservableObject {
    @Published var lines: [String] = []
    let skapi: Skapi

    init(skapi: Skapi) { self.skapi = skapi }

    func start() async throws {
        try await skapi.connectRealtime { [weak self] event in
            guard event.type == "message" || event.type == "private" else { return }
            let text = event.message["text"]?.string ?? ""
            Task { @MainActor in self?.lines.append(text) }
        }
    }
}
```

Calling `connectRealtime` again while connected only swaps the callback. That includes a connection skapi-swift opened on its own for [request status push](/api-bridge/forward-request#status-push): your call takes it over, and it is no longer closed for you. If that connection is still opening, `connectRealtime` waits for it and returns once it is open, or throws if it fails.

Request status frames (code `CSR_STATUS`, which the server sends to every connection of a user who sent a forwarded request with `notify`, from this app or another of the user's apps) never reach your callback. Read them with [onRequestStatus](/api-reference/api-bridge#onrequeststatus).

## Events

Every event is a `RealtimeEvent`:

| field | |
|---|---|
| `type` | `"message"`, `"private"`, `"notice"`, `"success"`, `"error"`, `"reconnect"` or `"close"` |
| `message` | the [`JSON`](/introduction/getting-started#json-values) value that was sent, or a status text |
| `sender` | user ID of the sender (message, private, notice) |
| `senderCid` | connection ID of the sender, `"cid:..."` |
| `senderRid` | the group it came through |
| `code` | on notices: `"USER_JOINED"`, `"USER_LEFT"` or `"USER_DISCONNECTED"` |

`event.json` gives the same event as one object with the skapi-js keys (`type`, `message`, `sender`, `sender_cid`, `sender_rid`, `code`).

| type | |
|---|---|
| `"message"` | a message posted to the group you are in |
| `"private"` | a message sent to you by user ID |
| `"notice"` | someone joined, left or was disconnected from your group; `sender` is that user. A disconnect comes as `USER_DISCONNECTED` followed by `USER_LEFT`. |
| `"success"` | the connection is open: the first time, and after each successful reconnect |
| `"error"` | the connection dropped (`"Skapi: WebSocket unexpected close."`), or could not reopen because the user signed out |
| `"reconnect"` | an attempt to reopen the connection follows, one event per attempt |
| `"close"` | you closed the connection |

Connection events (`success`, `error`, `reconnect`, `close`) carry only `type` and `message`.

## Staying connected

A dropped connection is reopened by skapi-swift on its own: after 3 seconds, then 6, 12 and 24, then every 30 seconds, for as long as the user is signed in. The group you were in is joined again. The waits vary a little from client to client, so a service coming back from an outage is not hit by every client in the same second.

A connection that dies without closing is caught too. skapi-swift checks it once a minute; ten seconds without an answer after a check counts as a drop.

The server closes every connection two hours after it opened. A few minutes before that, skapi-swift opens a fresh one and switches to it, joining the group again, and your callback hears nothing about it.

### When the app goes to the background

iOS suspends an app soon after it leaves the screen, and its connection drops. When the app returns to the foreground, or the network comes back, skapi-swift does not wait for the next retry: a dead connection reconnects at once, and one that looks open is asked whether it is still alive. See [App lifecycle](/introduction/getting-started#app-lifecycle). Messages sent while the app was away are not delivered later, so reload what you show (for example with [getRecords](/database/fetch)) after a `"success"` event.

A message posted while the connection is down is not queued: [postRealtime](/api-reference/realtime#postrealtime) throws `INVALID_REQUEST`, so keep the message until `"success"` comes back. After a reconnect the server gives the connection a new connection ID.

## Closing the connection

```swift
await skapi.closeRealtime()
```

Your callback gets `"close"`, and the other members of your group get `USER_DISCONNECTED` and `USER_LEFT` for you. [logout](/api-reference/authentication#logout) closes the connection too.
