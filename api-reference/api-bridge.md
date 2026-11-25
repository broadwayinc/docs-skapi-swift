# API Bridge

Every method throws [`SkapiError`](/introduction/errors) with a `code` and a `message`. Values that fail a check throw `INVALID_PARAMETER` before anything is sent. Any method can throw `NETWORK_ERROR` when no answer comes back, `TIMEOUT`, `RATE_LIMITED` or `SERVER_ERROR` (see [Errors](/introduction/errors)), and `ABORTED` when the `Task` that awaits it is cancelled. The waiting methods ([forwardRequestPoll](#forwardrequestpoll), [forwardRequestStream](#forwardrequeststream), and [forwardRequest](#forwardrequest) with `poll` or `stream`) do not end on these while they check for the answer: they try again. `forwardRequest`'s own dispatch is not tried again: it throws them as any call does, and the request may have reached the server anyway (see [Finding a request again](/api-bridge/forward-request#finding-a-request-again)). See [Forwarding Requests](/api-bridge/forward-request).

A request is addressed by its `request_id`, or by its short `id` (`"<stamp>:<entropy>"`) together with the `url` and `method` it was sent with. A signed-out caller can only reach its own requests from the same IP address and User-Agent; any other caller gets `NOT_EXISTS` (`Request not found.`).

## forwardRequest

```swift
func forwardRequest(_ options: JSON, form: JSON? = nil, multipart: [FormPart]? = nil,
                    onStream: (@Sendable (String, Int) -> Void)? = nil) async throws -> JSON
```

Calls another API from Skapi's server.

| argument | |
|---|---|
| `options` | Required. Keys below. |
| `form` | An object merged into `data`, or into `params` for `GET`, `DELETE` and `HEAD`; an option's own key wins. |
| `multipart` | The parts of a `multipart/form-data` body, with `"multipart": true` in `options`. See [FormPart](#formpart). |
| `onStream` | `(text, seq)`, called with each relayed piece of a streamed request, in order. |

| option key | type | |
|---|---|---|
| `url` | string | Required. A full URL. |
| `method` | string | `"GET"`, `"POST"` (default), `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`, any case. |
| `headers` | object | No name starting with `x-skapi-`. |
| `data` | object | The body: JSON when `Content-Type` is `application/json`, form-encoded otherwise. |
| `params` | object | The query string. |
| `secretName` | string | A client secret of the project. Its value replaces `"$CLIENT_SECRET"` in `url` and in every string of `headers`, `data` and `params`. Left out when `"$CLIENT_SECRET"` appears nowhere. |
| `skapiHeaders` | bool or `["user"?: Bool, "service"?: Bool]` | Sends `x-skapi-user` (the signed-in user's ID) and `x-skapi-service`. |
| `queue` | string | Queue the request on the server. No colons. |
| `cref` | string | Your own reference for this request, 1 to 64 letters, digits, `_` or `-`. Stored on it and handed back by the reply, [forwardRequestHistory](#forwardrequesthistory), [forwardRequestStatus](#forwardrequeststatus) and [forwardRequestRead](#forwardrequestread), so a send whose reply was lost can be found instead of sent again. Make a new one per request. |
| `notify` | bool | Status push for a queued request: each status change arrives over the realtime connection, and the poll then reads the request only when one names it (plus a heartbeat every minute) instead of at every interval. Needs a signed-in user and a queue. Purely an accelerator: with no connection, no frames, or a server that does not support it, the poll runs at its normal interval. See [onRequestStatus](#onrequeststatus). |
| `poll` | number or bool | Milliseconds between checks, 1000 or more (`true` = 1000; `0` does not poll); a shorter one is refused with `INVALID_PARAMETER`. Waits for the answer; makes a queue name when none is given. |
| `stream` | bool | Relay the answer as it arrives. Queued and polled like `poll`. |
| `expires` | number | Seconds the request stays in the history after it settles. |
| `multipart` | bool | Send the `multipart:` parts as `multipart/form-data`. Both are needed: the flag here and the parts in the argument. |
| `responseType` | `"json"` or `"text"` | Reshapes the answer. An envelope is returned unchanged. |

`"$ACCESS_TOKEN"` anywhere in `url`, `headers`, `data` or `params` becomes the signed-in user's access token (empty when signed out).

Returns:

- no `queue`, `poll` or `stream`: the destination's answer, parsed JSON or a `JSON` string, even when it looks like `{"status": "pending", "id": ...}`. Its status code is not returned.
- `queue` without `poll`: `{"id", "status": "pending", "queue_name", "in_queue", "request_id"}`, plus `"cref"` when it was given one and `"notify": true` when status push was accepted (pass it on as `notify:` to [forwardRequestPoll](#forwardrequestpoll)).
- `poll` or `stream`: what [forwardRequestPoll](#forwardrequestpoll) returns once the request settles.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"options" is required.` (`options` is not an object) |
| `INVALID_PARAMETER` | `"apiKeyHeader" and "apiKeyScheme" are no longer supported. Store the key as a client secret, name it with "secretName", and put "$CLIENT_SECRET" where the key goes.` |
| `INVALID_PARAMETER` | `"url" should be type: <string>.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"method" should be one of "GET", "POST", "PUT", "PATCH", "DELETE" or "HEAD".` |
| `INVALID_PARAMETER` | `"headers" should be type: <object>.` / `"data" should be type: <object>.` / `"params" should be type: <object>.` |
| `INVALID_PARAMETER` | `"headers" cannot set "<name>": the "x-skapi-" prefix is reserved. Use "skapiHeaders" to tell the destination who the caller is.` |
| `INVALID_PARAMETER` | `"skapiHeaders" should be type: <boolean> or { user?: boolean; service?: boolean }.` |
| `INVALID_PARAMETER` | `<value> is invalid in "secretName". allowed type or value is: Type<string>.` (also `"queue"`; `Type<number>` for `"expires"`) |
| `INVALID_PARAMETER` | `"stream" should be type: <boolean>.` / `"multipart" should be type: <boolean>.` / `"notify" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `"cref" should be 1 to 64 characters of letters, digits, "_" or "-".` |
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` |
| `INVALID_PARAMETER` | `"responseType" should be either "json" or "text".` / `"responseType": "response" is not available here. ...` |
| `INVALID_PARAMETER` | `"data" cannot be sent with "multipart": true. The form itself is the body.` |
| `INVALID_PARAMETER` | `"multipart": true needs the form parts in "multipart".` |
| `INVALID_PARAMETER` | `"files[0].file" cannot be read: <reason>.` (a `.file` part) |
| `INVALID_PARAMETER` | `Multipart body is too large: <n> bytes once base64 encoded, and the limit is 2031616. Upload the file first and send its url instead.` |
| `INVALID_REQUEST` | `Data should not exceed 2MB` (`form`) |
| `INVALID_REQUEST` | `Invalid clientSecretName.` / `No access to client secret.` (a locked secret and no signed-in user, or a lower access group) |
| `INVALID_REQUEST` | a URL the secret's destinations do not allow |
| `INVALID_REQUEST` | `Invalid queue name. Queue names cannot contain colons.` |
| `ERROR` | the destination could not be reached (inline request) |

An error answer from the destination is not thrown: inline it is returned as the answer, queued it is the `failed` result below.

## FormPart

```swift
enum FormPart {
    case field(String, JSON)      // a text field
    case file(String, UploadFile) // a file part
    case data(String, Data)       // bytes, sent as a file part named after the field
}
```

The parts of a multipart body, in order. A `.field` value is sent as text: a string as it is, `.null` as empty, a bool as `true` / `false`, anything else as JSON. A `.file` takes an [`UploadFile`](/api-reference/database#uploadfile) (its `name` is replaced by the part's name).

```swift
try await skapi.forwardRequest(
    ["secretName": "my_secret",
     "url": "https://api.example.com/v1/upload",
     "headers": ["Authorization": "Bearer $CLIENT_SECRET"],
     "multipart": true],
    multipart: [
        .field("title", "Holiday"),
        .file("photo", UploadFile(name: "photo", file: .url(photoURL))),
    ]
)
```

Nothing is filled in inside a multipart body. The body is capped at 2,031,616 characters once base64 encoded, about 1.5 MB of file.

## forwardRequestPoll

```swift
func forwardRequestPoll(_ requestId: String, poll: Double = 1000, url: String? = nil, method: String? = nil,
                        onStream: (@Sendable (String, Int) -> Void)? = nil,
                        service: String? = nil, owner: String? = nil, notify: Bool = false) async throws -> JSON
```

Waits for a queued request and returns its result. The first check goes out after `poll` milliseconds (`0` means 1000). A value under 1000 is refused with `INVALID_PARAMETER`. It waits until the request settles; there is no time limit. With `onStream`, new text of a streamed request is handed over as it arrives.

Failures on the way never end it: no network, no answer in time, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR` or a token refresh that got no answer. It tries again on a later check, waiting twice as long each time up to 30 seconds, and only the server's own answer (the result, or an error such as `NOT_EXISTS`) settles it. A `401` from the gateway refreshes the sign-in token once, then it carries on. While the user is signed out it waits for a sign in, sending nothing.

| argument | |
|---|---|
| `requestId` | The `request_id`, or the short `id` with `url` and `method`. |
| `poll` | Milliseconds between checks, 1000 or more (`0` means 1000). |
| `url`, `method` | Needed with a short `id`. |
| `onStream` | `(text, seq)` for a streamed request. |
| `service`, `owner` | Leave them out. |
| `notify` | The request was sent with `notify` and the reply said `"notify": true`. While status frames arrive, the request is read when a frame names it and otherwise once a minute; without frames it is read every `poll` as always. |

Returns:

| the request | returns |
|---|---|
| `resolved` | the destination's answer (or the finalized value of a streamed request) |
| `failed` | `{"status_code": Int, "body": String, "truncated": ...}`, or another error object such as `{"message", ...}` |
| `cancelled` | the envelope, `"status": "cancelled"` |
| streamed, not finalized | the envelope: `{"id", "status", "queue_name", "in_queue", "executed"?, "responded"?}`, plus `"stream", "chunks", "last_seq", "more"` and, when failed, `"error"` with `onStream` |

The wait is cancellable: cancelling the `Task` that awaits it throws `CancellationError`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forwardRequestStream

```swift
func forwardRequestStream(_ requestId: String, options: JSON? = nil,
                          onStream: (@Sendable (String, Int) -> Void)? = nil) async throws -> JSON
```

Reads a streamed request, from the start or after `since`, and returns once it settles. The first read is immediate. Running: hands new text to `onStream` until it settles, then returns the envelope. Settled, not finalized: hands over all the stored text, then returns the envelope. Finalized: returns the kept value. After three degraded reads in a row on a settled request it returns what it has.

| option key | type | |
|---|---|---|
| `url`, `method` | string | Needed with a short `id`. |
| `since` | number | Start after this `seq`. |
| `poll` | number | Milliseconds between reads while it runs, 1000 or more. Default 1000. |

Failures on the way never end it, with the same rules as [forwardRequestPoll](#forwardrequestpoll).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` / `"since" should be a number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forwardRequestFinalize

```swift
func forwardRequestFinalize(_ requestId: String, data: JSON? = nil, options: JSON? = nil) async throws -> JSON
```

Stores `data` as a settled streamed request's answer and releases its pieces. Later polls return `data`; [forwardRequestHistory](#forwardrequesthistory) lists it as `response_body`. Calling it again replaces the value. Without `data`, null is stored.

| option key | type | |
|---|---|---|
| `url`, `method` | string | Needed with a short `id`. |
| `ifAbsent` | bool | Store only when the request has no stored result yet. When it has one, nothing changes and the answer is `{"finalized": false, "reason": "exists"}`, so two devices settling the same turn cannot replace a complete answer with a partial one. |

Returns `{"finalized": Bool, "message": String, "reason"?: String}`. These come back with `finalized: false` instead of throwing:

| message | |
|---|---|
| `Finalized.` | done |
| `Request not found.` | no such request for this caller |
| `The request has not finished yet.` | it is still `pending` or `running` |
| `The request was not sent with stream, so its response is already stored.` | not a streamed request |
| `The request changed while it was being finalized. Try again.` | |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"ifAbsent" should be type: <boolean>.` |

## forwardRequestHistory

```swift
func forwardRequestHistory(_ params: JSON, fetchOptions: FetchOptions? = nil) async throws -> JSON
```

Your forwarded requests to one URL and method. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`; see [Paging](/database/fetch#paging). The server sends up to 100 at a time. See [Request history](/api-bridge/forward-request#request-history).

| key | type | |
|---|---|---|
| `url` | string | Required, as it was sent. |
| `method` | string | Required, upper case: `"GET"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`. |
| `status` | string | `"pending"`, `"running"`, `"resolved"` or `"failed"`. |
| `queue` | string | Requests in queues whose name starts with this. |
| `queue_exact` | bool | Only the queue named in `queue` (without it, `"u1"` also matches `"u1-bg"`). The server then reads only that queue's rows. Requests queued before 2026-06-05 were stored under an older queue format and are not listed with it: list those without `queue_exact`. |
| `queue_exclude` | string | Leave out this queue. Applied after the read, so a page can come back short while more rows remain: keep paging by `startKey` / `endOfList`. |
| `compact` | bool | Leave the bodies out; give `request_text`, `response_text`, `response_complete_marker` and `compact: true` instead. |
| `fields` | `"ids"` | A light listing: each row is only its `id`, `status`, times, `queue_name` and `cref`, no bodies, so a page stays small however long the conversations are. |
| `after` | string | Only requests newer than this request id (`"stamp:entropy"`): what has appeared since the newest one you already know. |
| `deadline` | number | Milliseconds the call may take in all; past it, it throws `TIMEOUT` (`No answer within <n> ms.`). |
| `fresh` | bool | Accepted for code shared with skapi-js. It changes nothing here: skapi-swift never joins a read to an identical one already in flight. |

Each item has `id`, `status_code`, `response_body` and `request_id`; the other keys are there when the server stored them:

| key | |
|---|---|
| `id` | the short id |
| `status_code` | the destination's status code, or `null` |
| `response_body` | the answer as stored, text (not parsed), or `null` |
| `error` | the error of a failed request |
| `created`, `updated` | milliseconds |
| `executed` | when it began running, milliseconds |
| `responded` | when the answer finished arriving, milliseconds |
| `request_body` | the `data` or `params` sent |
| `expires` | when it leaves the history |
| `status` | `"pending"`, `"running"`, `"resolved"`, `"failed"` or `"cancelled"` |
| `queue_name` | |
| `cref` | the `cref` it was sent with |
| `request_id` | for [forwardRequestPoll](#forwardrequestpoll) |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "url". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |
| `INVALID_PARAMETER` | `<value> is invalid in "status". allowed types or values are: "pending", "running", "resolved", "failed".` |
| `INVALID_PARAMETER` | `<value> is invalid in "queue". allowed type or value is: Type<string>.` (also `"queue_exclude"`) |
| `INVALID_PARAMETER` | `<value> is invalid in "compact". allowed type or value is: Type<boolean>.` (also `"queue_exact"`) |
| `INVALID_PARAMETER` | `"fields" should be "ids".` / `<value> is invalid in "after". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |

## forwardRequestStatus

```swift
func forwardRequestStatus(_ requests: [JSON], options: JSON? = nil) async throws -> JSON
```

Reads where many requests stand, in one call per 100: status, stream position, whether a result is stored, timestamps and `cref`. No bodies, so it stays small. A strongly consistent read: a request that just changed shows its new status. Made for showing many unfinished requests correctly after the app was away (in the background, or offline): one call says what happened to all of them. A request this caller cannot see comes back as `"missing"` instead of failing the call.

| argument | |
|---|---|
| `requests` | Full request ids (`.string(requestId)`), or `["id": shortId, "url": ..., "method": ...]`. More than 100 are sent 100 at a time, one call after another. |
| `options` | `deadline` (milliseconds per call, then `TIMEOUT`), `fresh` (accepted, changes nothing), `service`, `owner`. |

Returns `{"list": [...]}` in the order asked, plus anything else the server reports beside the list. Each item:

| key | |
|---|---|
| `id` | the short id |
| `status` | `"pending"`, `"running"`, `"resolved"`, `"failed"`, `"cancelled"` or `"missing"` (never sent, expired, deleted, or sent by someone else) |
| `queue` | |
| `stream` | `true` when it was sent with `stream` |
| `final_seq` | the last piece's `seq`, written when a streamed request settles; a reader is done once its cursor reaches it |
| `has_body` | a stored result exists (read it with [forwardRequestRead](#forwardrequestread)) |
| `created`, `updated`, `executed`, `responded` | milliseconds |
| `cref` | |

```swift
let status = try await skapi.forwardRequestStatus(
    [["id": "stamp:entropy", "url": "https://api.example.com/v1/chat", "method": "POST"]],
    options: ["deadline": 15000]
)
```

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"requests" should be an array of request ids or { id, url, method }.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |
| `TIMEOUT` | `No answer within <n> ms.` |

## forwardRequestQueueCounters

```swift
func forwardRequestQueueCounters(_ queues: [String], options: JSON? = nil) async throws -> JSON
```

The counters of up to 20 queues: `{"queues": {name: {"cnt", "rct", "seq", "in_queue"}}}`. `rct` grows whenever a request on the queue finishes and `seq` whenever one is added, so an app that watches many unfinished requests can read these on every check (each is a few bytes) and read the requests themselves with [forwardRequestStatus](#forwardrequeststatus) only when a counter moved. A queue that never had a request is left out. `options` as for [forwardRequestStatus](#forwardrequeststatus).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queues" should be an array of 1 to 20 queue names.` (an empty name or one with a colon too) |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |
| `TIMEOUT` | `No answer within <n> ms.` |

## forwardRequestRead

```swift
func forwardRequestRead(_ params: JSON) async throws -> JSON
```

Reads one request in full, always in the same shape, whatever state it is in. Unlike a poll, a resolved request does not come back as its bare answer, so the status is always there to read, and a failed streamed request comes back with the text that arrived before it failed.

| key | type | |
|---|---|---|
| `id` | string | Required. The short id with `url` and `method`, or a full `request_id` alone. |
| `url`, `method` | string | Needed with a short `id`. |
| `since` | number | A piece's `seq` (`0` for the beginning): a streamed request's text after it comes back too, with `"more": true` when there is more than one read returns. |
| `deadline`, `fresh` | | As for [forwardRequestStatus](#forwardrequeststatus). |

Returns `{"id", "status", "body"?, "error"?, "body_unavailable"?, "stream"?, "chunks"?, "last_seq"?, "final_seq"?, "more"?, "created"?, "updated"?, "executed"?, "responded"?, "cref"?}`. `body` is the stored result (the destination's answer, or what [forwardRequestFinalize](#forwardrequestfinalize) kept); `body_unavailable: true` means a result is stored but could not be loaded this time, so read again later.

```swift
let res = try await skapi.forwardRequestRead(
    ["id": "stamp:entropy", "url": "https://api.example.com/v1/chat", "method": "POST", "since": 0]
)
```

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"params" should be type: <object>.` / `"since" should be a number.` / `"requestId" should be type: <string>.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |
| `TIMEOUT` | `No answer within <n> ms.` |

## onRequestStatus

```swift
nonisolated func onRequestStatus(_ callback: @escaping @Sendable (RequestStatusEvent) -> Void) -> @Sendable () -> Void
nonisolated func isRequestStatusLive() -> Bool
```

Listens to status changes of this user's requests sent with `notify: true`, including ones this app holds no poll for (a pass the server queued as the continuation of one, or a request sent from another device of the same user). Returns a function that removes the listener. Not awaited.

The realtime connection is kept open while a listener is registered: one is opened when the app has none and a user is signed in, and closed again 10 minutes after the last listener and `notify` poll let go, unless the app joined a group on it or took it over with [connectRealtime](/api-reference/realtime#connectrealtime). These frames never reach the app's own realtime callback.

`RequestStatusEvent` has `type` and, for `"status"`, `id`, `queue`, `status`, `previous`, `updated` and `executed` (`json` gives them as an object):

| type | |
|---|---|
| `"status"` | A request changed status. `id` is the short id, `status` the new status, `previous` the one before (absent when it was just created), `updated` when it changed and `executed` when the server began running it, in milliseconds. |
| `"connected"` | The listener is on an open connection, first time and after every reconnect. Frames are not kept while the connection is down, so re-read what you show. |
| `"disconnected"` | The connection went away. |

A status event is a hint, never the outcome: read the request ([forwardRequestRead](#forwardrequestread), [forwardRequestStatus](#forwardrequeststatus) or its poll) for that.

`isRequestStatusLive()` is `true` while status frames are arriving on this client: the server accepted `notify`, the connection is open, and a frame came in on it. `notify` polls run slowly only while it is `true`.

```swift
let stop = skapi.onRequestStatus { event in
    if event.type == "status" { print(event.id ?? "", event.status ?? "") }
}
// later
stop()
```

## cancelForwardRequest

```swift
func cancelForwardRequest(_ params: JSON) async throws -> JSON
```

Cancels a request that is still `pending` or `running`; it stays in the history as `cancelled`. A streamed request's pieces are discarded. `params`: `url`, `method` (upper case) and `id` (the short id), all required.

Returns `{"removed": Bool, "message": String}`: `Cancelled.`, `Request not found.` or `The request has already been processed.`

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` / `Key "id" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |
| `INVALID_PARAMETER` | `<value> is invalid in "url". allowed type or value is: Type<string>.` (also `"id"`) |

## forwardRequestQueueCount

```swift
func forwardRequestQueueCount(_ params: JSON) async throws -> JSON
```

How many requests wait in one queue. Signed-in users only. `params`: `["queue": String]`.

Returns `{"queue_name": String, "in_queue": Int}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queue" is required.` |
| `INVALID_REQUEST` | `User login is required.` |
