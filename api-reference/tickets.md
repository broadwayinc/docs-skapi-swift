# Tickets

Every method throws [`SkapiError`](/introduction/errors) with a `code` and a `message`, and can throw `NETWORK_ERROR` when no answer comes back. See [Tickets](/tickets/tickets).

## consumeTicket

```swift
func consumeTicket(ticketId: String, method: String = "POST", data: JSON? = nil, auth: Bool = false) async throws -> JSON
```

Calls a ticket of the project, at `https://<first 4 characters of the Project ID>.skapi.dev/`.

| argument | |
|---|---|
| `ticketId` | Letters, digits, `_` and `-`, up to 64 characters, starting with a letter or digit. |
| `method` | `"GET"` or `"POST"`, any case. `GET` sends `data` as the query string (`/tg/` route); `POST` sends it as the JSON body (`/tp/` route). |
| `data` | The request data. Defaults to `{}`. |
| `auth` | `true` sends the call as the signed-in user (`POST /tpa/` route, with the user's token). POST only. |

Returns the receipt, or the body a Respond action of the ticket composed, as sent:

```json
{
    "ticket_id": "unlock-guide",
    "consume_id": "UwdAhf6k3Qp",
    "user_id": "f2b6c9e1-...",
    "is_test": false,
    "timestamp": 1757721600000,
    "hash": "..."
}
```

| key | |
|---|---|
| `consume_id` | base62 of the time in milliseconds, then 4 random characters |
| `user_id` | the user with `auth: true`, else `"<ip>(<user agent>)"` |
| `timestamp` | milliseconds, read from `consume_id` |
| `hash` | proof string of the consumption |
| `queued` | `true` only when the call waits for a free slot; its actions run later |
| `position` | with `queued`: place in the line, 1 = next |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Ticket ID is required.` |
| `INVALID_PARAMETER` | `Invalid "ticket_id". Use letters, digits, "_" and "-" (up to 64 chars, starting with a letter or digit).` |
| `INVALID_PARAMETER` | `Method is required. Should be either "GET" or "POST"` |
| `INVALID_PARAMETER` | `Method should be either "GET" or "POST".` |
| `INVALID_PARAMETER` | `Signed-in consumption is POST only.` |
| `INVALID_REQUEST` | `User login is required.` (`auth: true`, signed out) |
| `TICKET_BUSY` | every slot of a ticket with a concurrency limit is taken. Nothing was consumed; try again later. |
| the ticket's code | the ticket's message. `cause` is the whole error body as `JSON`: `{"code", "message", "stage", "action"?, "detail"?, "ticket_id"}`. Thrown whether the ticket answered 400 or 200. See [When a consumption fails](/tickets/tickets#when-a-consumption-fails). |

```swift
do {
    _ = try await skapi.consumeTicket(ticketId: "launch-coupon", method: "GET", data: ["code": "WRONG"])
} catch let err as SkapiError {
    let body = err.cause as? JSON
    print(err.code, body?["stage"]?.string ?? "")
}
```

## getTickets

```swift
func getTickets(_ params: JSON? = nil, fetchOptions: FetchOptions? = nil) async throws -> JSON
```

The project's tickets. Signed-in users only. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`, up to 100 a page; see [Paging](/database/fetch#paging).

| key | type | |
|---|---|---|
| `ticket_id` | string | Only this ticket. |

Each row:

| key | |
|---|---|
| `ticket_id` | |
| `description` | |
| `count` | consumptions left, when the ticket has a count |
| `time_to_live` | when it expires, milliseconds, when it has one |
| `timestamp` | when it was registered, milliseconds |

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_REQUEST` | `Invalid ticket id.` (`ticket_id` contains `#` or `@`) |

## getConsumedTickets

```swift
func getConsumedTickets(_ params: JSON? = nil, fetchOptions: FetchOptions? = nil) async throws -> JSON
```

The signed-in user's own consumptions, the ones made with `auth: true`, oldest first. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`.

| key | type | |
|---|---|---|
| `ticket_id` | string | Only tickets whose ID starts with this. |

Each row:

| key | |
|---|---|
| `ticket_id`, `consume_id`, `timestamp` | as in the receipt |
| `user_id`, `reg` | the user's ID |
| `is_test` | `false` (dry runs are anonymous, so they never appear here) |
| `description` | the consumption log as JSON text, with `data`, `method`, `headers`, `ip`, `user_agent`, `timestamp` and `outcome` (`ok`, `actions`, `error`, ...); read it with `JSON.parse(_:)` |
| `hash` | proof string of the consumption |

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
