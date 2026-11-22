# API Bridge

Every method throws [`SkapiError`](/introduction/errors) with a `code` and a `message`. Values that fail a check throw `INVALID_PARAMETER` before anything is sent. Any method can throw `NETWORK_ERROR` when no answer comes back. See [Forwarding Requests](/api-bridge/forward-request).

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
| `poll` | number or bool | Milliseconds between checks, 1000 or more (`true` = 1000; `0` does not poll); a shorter one is refused with `INVALID_PARAMETER`. Waits for the answer; makes a queue name when none is given. |
| `stream` | bool | Relay the answer as it arrives. Queued and polled like `poll`. |
| `expires` | number | Seconds the request stays in the history after it settles. |
| `multipart` | bool | Send the `multipart:` parts as `multipart/form-data`. Both are needed: the flag here and the parts in the argument. |
| `responseType` | `"json"` or `"text"` | Reshapes the answer. An envelope is returned unchanged. |

`"$ACCESS_TOKEN"` anywhere in `url`, `headers`, `data` or `params` becomes the signed-in user's access token (empty when signed out).

Returns:

- no `queue`, `poll` or `stream`: the destination's answer, parsed JSON or a `JSON` string, even when it looks like `{"status": "pending", "id": ...}`. Its status code is not returned.
- `queue` without `poll`: `{"id", "status": "pending", "queue_name", "in_queue", "request_id"}`.
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
| `INVALID_PARAMETER` | `"stream" should be type: <boolean>.` / `"multipart" should be type: <boolean>.` |
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
                        service: String? = nil, owner: String? = nil) async throws -> JSON
```

Waits for a queued request and returns its result. The first check goes out after `poll` milliseconds (`0` means 1000). A value under 1000 is refused with `INVALID_PARAMETER`. It waits until the request settles; there is no time limit. With `onStream`, new text of a streamed request is handed over as it arrives.

| argument | |
|---|---|
| `requestId` | The `request_id`, or the short `id` with `url` and `method`. |
| `poll` | Milliseconds between checks, 1000 or more (`0` means 1000). |
| `url`, `method` | Needed with a short `id`. |
| `onStream` | `(text, seq)` for a streamed request. |
| `service`, `owner` | Leave them out. |

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

Stores `data` as a settled streamed request's answer and releases its pieces. Later polls return `data`; [forwardRequestHistory](#forwardrequesthistory) lists it as `response_body`. Calling it again replaces the value. Without `data`, null is stored. `options`: `url` and `method`, needed with a short `id`.

Returns `{"finalized": Bool, "message": String}`. These come back with `finalized: false` instead of throwing:

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
| `queue_exact` | bool | Only the queue named in `queue`. |
| `queue_exclude` | string | Leave out this queue. |
| `compact` | bool | Leave the bodies out; give `request_text`, `response_text`, `response_complete_marker` and `compact: true` instead. |

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
