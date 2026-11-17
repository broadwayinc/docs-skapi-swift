# Forwarding Requests

[forwardRequest(_:form:multipart:onStream:)](/api-reference/api-bridge#forwardrequest) calls another API from Skapi's server instead of from your app. Use it when the call needs a key you must not ship inside your app, when its answer should be kept and read again later, or when you want the answer streamed as it arrives.

Answers arrive by polling. A call that waits for an answer suspends its task until that answer is ready, without blocking a thread.

## Sending a request

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let answer = try await skapi.forwardRequest([
    "url": "https://api.example.com/v1/report",
    "method": "POST",
    "headers": ["Content-Type": "application/json"],
    "data": ["report": "quarterly"],
])
```

| option | |
|---|---|
| `url` | Required. A full URL. |
| `method` | `"GET"`, `"POST"` (default), `"PUT"`, `"PATCH"`, `"DELETE"` or `"HEAD"`, any case. |
| `headers` | object. A name starting with `x-skapi-` is refused. |
| `data` | object, the body. Sent as JSON only when your `Content-Type` header is `application/json`, otherwise form-encoded. |
| `params` | object, the query string. A `?query` in `url` is added to it. |
| `secretName` | A client secret to fill in, see below. |
| `skapiHeaders` | Tell the destination who is calling, see below. |
| `queue`, `poll`, `stream`, `expires` | See [Queued requests](#queued-requests) and [Streamed requests](#streamed-requests). |
| `multipart` | `true` sends the `multipart:` parts as a multipart body, see below. |
| `responseType` | `"json"` parses a string answer (a string that does not parse comes back unchanged); `"text"` gives a string, turning anything else into JSON text. |

`form:` is an object merged into `data` (or into `params` for `GET`, `DELETE` and `HEAD`). Where `form` and the option hold the same key, the option wins.

```swift
try await skapi.forwardRequest(["url": "https://api.example.com/search", "method": "GET"], form: ["q": "otter"])
```

Signing in is not required. A signed-out caller is known to the server by IP address and User-Agent only (see [Reading an answer later](#reading-an-answer-later)).

## Client secrets

Store the key on skapi.com as a client secret of your project, name it with `secretName`, and put `"$CLIENT_SECRET"` where the value goes: in `url`, or in any string value of `headers`, `data` or `params`, at any depth.

```swift
let answer = try await skapi.forwardRequest([
    "secretName": "my_secret",
    "url": "https://api.example.com/v1/report",
    "headers": [
        "Content-Type": "application/json",
        "Authorization": "Bearer $CLIENT_SECRET",
    ],
    "data": ["report": "quarterly"],
])
```

The value is filled in on the server, so it never reaches your app. A locked secret needs a signed-in user whose access group reaches the secret's, and a secret limited to some destinations refuses other URLs. When `"$CLIENT_SECRET"` appears nowhere, skapi-swift leaves `secretName` out and sends the request as written.

`"$ACCESS_TOKEN"` works the same way, without a secret: the server replaces it with the signed-in user's access token, or with nothing when signed out.

## Telling the destination who is calling

`skapiHeaders` is off by default.

| value | the destination receives |
|---|---|
| `true` | `x-skapi-user` and `x-skapi-service` |
| `["user": true]` | `x-skapi-user`: the signed-in user's ID, left out when signed out |
| `["service": true]` | `x-skapi-service`: the project's ID |

Skapi's server writes these from the verified caller, so the destination can trust them. That is why your own `x-skapi-` headers are refused.

## Multipart bodies

`"multipart": true` sends the parts you pass in `multipart:` as a `multipart/form-data` body. Each part is a `FormPart`:

| part | sent as |
|---|---|
| `.field(name, JSON)` | text: a string as it is, `.null` as empty, a boolean as `true` or `false`, objects and arrays as JSON |
| `.file(name, UploadFile)` | a file, read like on [Files](/database/files#uploading-with-a-record) |
| `.data(name, Data)` | a file part named after the field |

```swift
try await skapi.forwardRequest(
    [
        "secretName": "my_secret",
        "url": "https://api.example.com/v1/upload",
        "headers": ["Authorization": "Bearer $CLIENT_SECRET"],
        "multipart": true,
    ],
    multipart: [
        .field("title", "Holiday"),
        .file("photo", UploadFile(name: "photo", file: .url(beachURL))),
    ]
)
```

Both are needed: `"multipart": true` without parts throws `INVALID_PARAMETER`, and parts without `"multipart": true` are not sent. `data` cannot be sent with `multipart`. Nothing is filled in inside a multipart body. The body is capped at 2,031,616 characters once base64 encoded, about 1.5 MB of file: upload bigger files first and send their URL.

## Three ways to get the answer

| you pass | what happens | `forwardRequest` returns |
|---|---|---|
| no `queue`, `poll` or `stream` | **inline**: the destination is called at once | its answer |
| `queue`, no `poll` | **queued**: the request waits its turn on the server | the envelope, at once |
| `poll` or `"stream": true` | **queued**, then polled | the answer, when it is ready |

Inline answers come back as text or parsed JSON. The destination's status code is not returned, so an error answer comes back like any other; its status code is in [forwardRequestHistory](#request-history). Inline requests must be answered within about 29 seconds; queue anything slower.

## Queued requests

```swift
let env = try await skapi.forwardRequest([
    "secretName": "openai",
    "url": "https://api.openai.com/v1/images/generations",
    "headers": ["Content-Type": "application/json", "Authorization": "Bearer $CLIENT_SECRET"],
    "data": ["model": "gpt-image-1", "prompt": "A sea otter", "n": 1],
    "queue": "images",
])
```

The envelope:

```json
{
  "id": "<stamp>:<entropy>",
  "status": "pending",
  "queue_name": "images",
  "in_queue": 1,
  "request_id": "[POST]https://api.openai.com/v1/images/generations#<project id>:<stamp>:<entropy>"
}
```

`id` is the short id, and `in_queue` the place in the queue, this request included (1 = next). Keep `request_id`: it is how you read the answer. Queue names cannot contain colons. `expires` (seconds) removes the request from the history that long after it settles.

`poll` (milliseconds between checks, `true` for 1000) does the waiting for you. A queue name is made up when you give none.

```swift
let result = try await skapi.forwardRequest([
    "url": "https://api.example.com/v1/slow-report",
    "data": ["report": "yearly"],
    "poll": 2000,
])
```

The first check goes out after one interval. There is no time limit: the call returns when the request settles. Cancelling the task that runs it stops the waiting (the request itself goes on, on the server).

What a settled request returns:

- `resolved`: the destination's answer, as it is. An answer with a `"status"` key of its own (even `"pending"`) is returned, not waited on: only Skapi's envelope, which has `in_queue`, means the request is still waiting. The same goes for `"chunks"` or `"more"` in the answer: they are the destination's data, never handed to `onStream` as streamed text.
- `failed` with an error answer (status 400 or above): `{"status_code": ..., "body": "...", "truncated": ...}`. This is returned, not thrown.
- `cancelled`: the envelope with `"status": "cancelled"`.

## Reading an answer later

[forwardRequestPoll(_:poll:url:method:onStream:service:owner:)](/api-reference/api-bridge#forwardrequestpoll) waits for a queued request and returns the same values:

```swift
let requestId = env["request_id"]?.string ?? ""
let result = try await skapi.forwardRequestPoll(requestId, poll: 2000)

// or with the short id
let again = try await skapi.forwardRequestPoll(env["id"]?.string ?? "",
                                               url: "https://api.openai.com/v1/images/generations", method: "POST")
```

Only the caller who made a request can read it. A signed-in caller is the user, on any device. A signed-out caller is the IP address and User-Agent pair, so a request made signed out must be polled, cancelled and finalized from the same IP with the same User-Agent; otherwise it is `NOT_EXISTS` (`Request not found.`). A phone moving between Wi-Fi and a cellular network changes its IP, so sign the user in for requests you read later.

## Streamed requests

`"stream": true` makes Skapi relay the destination's answer as it arrives, and `onStream(text, seq)` receives each piece in order. Pieces end wherever the destination paused, so buffer them until your own format says a unit is complete. The callback runs on a background task: hop to the main actor to show the text.

Ask the destination for a streamed answer too: that is part of your own `data`, and Skapi never reads it.

```swift
// collects server-sent events ("data: {...}\n\n") into the answer text
final class EventReader: @unchecked Sendable {
    private let lock = NSLock()
    private var buffer = ""
    private(set) var answer = ""

    func feed(_ text: String) {
        lock.lock(); defer { lock.unlock() }
        buffer += text
        var frames = buffer.components(separatedBy: "\n\n")
        buffer = frames.removeLast()
        for frame in frames {
            for line in frame.split(separator: "\n") where line.hasPrefix("data: ") {
                let payload = String(line.dropFirst(6))
                if payload == "[DONE]" { continue }
                let delta = try? JSON.parse(payload)
                answer += delta?["choices"]?[0]?["delta"]?["content"]?.string ?? ""
            }
        }
    }
}

let reader = EventReader()
let env = try await skapi.forwardRequest(
    [
        "secretName": "openai",
        "url": "https://api.openai.com/v1/chat/completions",
        "headers": ["Content-Type": "application/json", "Authorization": "Bearer $CLIENT_SECRET"],
        "data": ["model": "gpt-4.1", "stream": true, "messages": [["role": "user", "content": "Hi"]]],
        "stream": true,    // Skapi's own flag
    ],
    onStream: { text, seq in reader.feed(text) }
)
print(env["status"]?.string ?? "")   // "resolved"
```

A streamed request settles with the envelope and no body, and with `onStream` the envelope also carries `stream`, `chunks`, `last_seq` and `more`. A failed one has `"status": "failed"` and an `error` object, and keeps the text that did arrive (without `onStream` you get the `error` object alone). It is not thrown.

### Reading a stream again

[forwardRequestStream(_:options:onStream:)](/api-reference/api-bridge#forwardrequeststream) reads a streamed request from the start, or after `since`: while it runs it hands new text to `onStream`; once it has settled it hands over all the stored text and returns the envelope; once it is finalized it returns the kept body.

```swift
try await skapi.forwardRequestStream(requestId, options: ["poll": 1000], onStream: { text, seq in reader.feed(text) })
```

### Keeping the answer

Until you finalize it, a streamed request keeps every piece and its history has no answer. [forwardRequestFinalize(_:data:options:)](/api-reference/api-bridge#forwardrequestfinalize) stores what you pass as its answer and releases the pieces; later polls return that value. Finalizing again replaces it. Calling it without `data` stores `null` and still releases the pieces.

```swift
try await skapi.forwardRequestFinalize(requestId, data: .string(reader.answer))
// {"finalized": true, "message": "Finalized."}
```

Only a settled request can be finalized. After three failed reads of the pieces in a row on a settled request, the read gives up and returns what it has, so check your text is complete before you finalize it.

## Request history

[forwardRequestHistory(_:fetchOptions:)](/api-reference/api-bridge#forwardrequesthistory) lists your requests to one `url` and `method` (upper case), with their answers:

```swift
let history = try await skapi.forwardRequestHistory([
    "url": "https://api.openai.com/v1/images/generations",
    "method": "POST",
    "status": "pending",       // optional: "pending", "running", "resolved", "failed"
    "queue": "images",         // optional, matches as a prefix; add "queue_exact": true for this queue only
])

for item in history["list"]?.array ?? [] {
    print(item["status"]?.string ?? "", item["status_code"] ?? .null, item["created"] ?? .null)
    if let status = item["status"]?.string, status == "pending" || status == "running" {
        print(try await skapi.forwardRequestPoll(item["request_id"]?.string ?? ""))
    }
}
```

`"compact": true` leaves the bodies out and gives short `request_text` and `response_text` instead. The listing pages like [getRecords](/database/fetch#paging).

## Cancelling and counting

```swift
try await skapi.cancelForwardRequest(["url": "https://api.openai.com/v1/images/generations", "method": "POST", "id": env["id"] ?? .null])
// {"removed": true, "message": "Cancelled."}

try await skapi.forwardRequestQueueCount(["queue": "images"])
// {"queue_name": "images", "in_queue": 3}   signed-in users only
```

Cancel takes the short `id`, and only reaches a request that is still `pending` or `running`. Cancelling a streamed request discards its pieces.
