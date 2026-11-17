# Realtime

See [Connecting to Realtime](/realtime/connecting) and [Groups and Messages](/realtime/groups). Every method that throws, throws [`SkapiError`](/introduction/errors).

## connectRealtime

```swift
func connectRealtime(_ callback: @escaping @Sendable (RealtimeEvent) -> Void) async throws
```

Opens the realtime connection and returns once it is open. `callback` runs on a background task for every event; hop to the main actor for UI work. See [Events](/realtime/connecting#events). Called again while connected, it only swaps the callback. The connection reopens on its own after a drop.

```swift
try await skapi.connectRealtime { event in
    Task { @MainActor in
        messages.append(event)
    }
}
```

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No access.` (not signed in) |
| `INVALID_REQUEST` | `WebSocket closed before it opened.` |

## closeRealtime

```swift
func closeRealtime()
```

Closes the connection. The callback gets `"close"`; the group gets `USER_DISCONNECTED` and `USER_LEFT`. Does nothing when no connection is open. It is not `async`, but from outside the actor it is called with `await skapi.closeRealtime()`.

## joinRealtime

```swift
func joinRealtime(group: String?) async throws -> JSON
```

Joins a group, leaving the current one. `nil` (or `""`) leaves the group.

```json
{"type": "success", "message": "Joined realtime message group: \"lobby\"."}
{"type": "success", "message": "Left realtime message group."}
```

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No realtime connection. Execute connectRealtime() before this method.` |

## postRealtime

```swift
func postRealtime(_ message: JSON, recipient: String, notification: JSON? = nil) async throws -> JSON
```

Sends any JSON value to a user (`recipient` is a user ID) or to the group you joined (`recipient` is its name). Returns `{"type": "success", "message": "Message sent."}`.

`notification`: `["title": String, "body": String, "config"?: ["always": Bool]]`, a web push for recipients in a browser. See [Notifications](/realtime/groups#notifications).

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No realtime connection. Execute connectRealtime() before this method.` |
| `INVALID_REQUEST` | `No recipient.` |
| `INVALID_REQUEST` | `User has not joined to the recipient group. Run joinRealtime(group: "<group>")` |
| `INVALID_REQUEST` | `Realtime connection is not open. Try reconnecting with connectRealtime().` (the connection is down) |
| `INVALID_PARAMETER` | `Message is <n> bytes; a realtime message can be at most 32768 bytes including its headers.` |
| `INVALID_PARAMETER` | `"notification" should be an object with "title" and "body".` / `Key "title" is required.` / `"title" should be type: <string>.` / `"config.always" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `Notification size exceeds 3kb.` |

## getRealtimeGroups

```swift
func getRealtimeGroups(_ params: JSON? = nil, fetchOptions: FetchOptions? = nil) async throws -> JSON
```

Groups that have members now: `{"list": [{"group", "number_of_users"}], ...}`. Left out, `params` lists every group.

| key | |
|---|---|
| `searchFor` | `"group"` (default) or `"number_of_users"` |
| `value` | a string for `"group"`, a number for `"number_of_users"` |
| `condition` | `">"`, `">="`, `"="`, `"<"`, `"<="`, `"!="` (or `gt`, `gte`, `eq`, `lt`, `lte`, `ne`) |
| `range` | an upper bound of the same type as `value`; replaces `condition` |

`fetchOptions`: see [Paging](/database/fetch#paging).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"<value>" is invalid in "searchFor". allowed types or values are: "group", "number_of_users".` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "condition". allowed types or values are: ...` |
| `INVALID_PARAMETER` | `"value" must be a number.` / `"value" must be a string.` / `"range" must be a number.` / `"range" must be a string.` |

## getRealtimeUsers

```swift
func getRealtimeUsers(_ params: JSON? = nil, fetchOptions: FetchOptions? = nil) async throws -> JSON
```

Connections in a group: `{"list": [{"user_id", "cid"}], ...}`.

| key | |
|---|---|
| `group` | the group; left out, the one you joined |
| `user_id` | only this user's connections |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `No group has been joined. Otherwise "group" is required.` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "group". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `User ID in "user_id" is empty.` / `User ID in "user_id" is invalid.` |

## RealtimeEvent

```swift
struct RealtimeEvent {
    let type: String
    let message: JSON
    let sender: String?
    let senderCid: String?
    let senderRid: String?
    let code: String?
    var json: JSON { get }
}
```

| field | |
|---|---|
| `type` | `"message"`, `"private"`, `"notice"`, `"success"`, `"error"`, `"reconnect"` or `"close"` |
| `message` | the JSON value that was sent, or a status text |
| `sender` | user ID of the sender (message, private, notice) |
| `senderCid` | connection ID of the sender, `"cid:..."` |
| `senderRid` | the group it came through |
| `code` | on notices: `USER_JOINED`, `USER_LEFT` or `USER_DISCONNECTED` |
| `json` | the event as an object with the skapi-js keys: `type`, `message`, `sender`, `sender_cid`, `sender_rid`, `code` |

See [Events](/realtime/connecting#events).
