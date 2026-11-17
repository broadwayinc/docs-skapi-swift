# Subscriptions and Feed

Users can subscribe to other users. A subscriber can read the records a user posts for subscribers, and get the ones posted to the feed in one list with [`getFeed(_:fetchOptions:)`](/api-reference/users#getfeed). Every method on this page needs a signed-in user.

## Subscribing

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
try await skapi.login(email: "b@example.com", password: "password")

let sub = try await skapi.subscribe(["user_id": "<user A id>", "get_feed": true])
print(sub)  // {"subscriber":"<user B id>","subscription":"<user A id>","timestamp":...,"blocked":false,"get_feed":true,...}
```

| option | |
|---|---|
| `get_feed` | `true` puts the user's feed records in your [`getFeed()`](#the-feed). Needed for the feed. |
| `get_notified` | Web push notifications for the user's new records. The browser registers for them with skapi-js; skapi-swift saves the preference only (see [Not Included](/introduction/not-included)). |
| `get_email` | A preference saved with the subscription. `true` needs a verified e-mail, otherwise `User has no verified email address.` |

A new subscription starts with every option off. Calling `subscribe()` again for the same user changes only the options you pass and keeps the others.

You cannot subscribe to yourself. If the user blocked you, the call fails with `The subscription is blocked.`

```swift
try await skapi.unsubscribe(["user_id": "<user A id>"])  // "SUCCESS: The user has unsubscribed."
```

## Blocking subscribers

A user can stop another user from reading their subscription records:

```swift
try await skapi.blockSubscriber(["user_id": "<user B id>"])    // "SUCCESS: Blocked user ID \"<user B id>\"."
try await skapi.unblockSubscriber(["user_id": "<user B id>"])  // "SUCCESS: Unblocked user ID \"<user B id>\"."
```

A user can be blocked before they ever subscribe. An unblocked subscriber gets their subscription back with the options they had; unblocking someone who never subscribed does not subscribe them. Blocking guards the subscription records only: files on those records are still reachable by their link unless the record is private or in a higher access group.

## Listing subscriptions

Pass `subscriber`, `subscription`, or both (user IDs):

```swift
// who user B subscribes to
try await skapi.getSubscriptions(["subscriber": "<user B id>"])

// who subscribes to user A
try await skapi.getSubscriptions(["subscription": "<user A id>"])

// is user B subscribed to user A? (one row, or an empty list)
try await skapi.getSubscriptions(["subscriber": "<user B id>", "subscription": "<user A id>"])

// the users who blocked user B
try await skapi.getSubscriptions(["subscriber": "<user B id>", "blocked": true])
```

Each row is `{"subscriber", "subscription", "timestamp", "blocked"}`. With `subscriber` alone, `blocked: true` lists only the blocked rows and anything else lists only the active ones. With `subscription` alone, every subscriber comes back, blocked ones included, each with its `blocked` flag; `blocked: true` lists only the blocked ones.

Your own user ID as `subscription` lists your own subscribers:

```swift
let me = await skapi.user?["user_id"]?.string ?? ""
let mySubscribers = try await skapi.getSubscriptions(["subscription": .string(me)])
let blockedByMe = try await skapi.getSubscriptions(["subscription": .string(me), "blocked": true])
```

Your subscriber count is `subscribers` in your [`getUsers()`](/users/search) result.

The paging options are the same as for [`getRecords()`](/database/fetch#paging).

## Posting to subscribers

A record is for subscribers when it is posted with `table.subscription` in [`postRecord()`](/database/create):

```swift
try await skapi.postRecord(["title": "New post"], config: [
    "table": [
        "name": "Posts",
        "access_group": "authorized",
        "subscription": [
            "is_subscription_record": true,  // only subscribers can read it
            "upload_to_feed": true,          // and it appears in their feed
        ],
    ],
])
```

- `is_subscription_record`: only the uploader's subscribers (not blocked) can read the record.
- `upload_to_feed`: the record goes to the feed of subscribers who set `get_feed`. Off unless set.

Both are independent. Signed-out users cannot post subscription records.

Subscribers read the subscription records of one user with `table.subscription` in [`getRecords()`](/database/fetch):

```swift
try await skapi.getRecords(["table": ["name": "Posts", "access_group": "authorized", "subscription": "<user A id>"]])
```

## The feed

[`getFeed(_:fetchOptions:)`](/api-reference/users#getfeed) lists the feed records of every user you subscribe to with `get_feed`, newest first:

```swift
let feed = try await skapi.getFeed(["access_group": "authorized"])
for record in feed["list"]?.array ?? [] {
    print(record["user_id"]?.string ?? "", record["data"] ?? .null)
}
```

`access_group` picks which records: `"public"` (0), `"authorized"` (1, the default) or a higher number up to your own access group. Each row is a record, as [`getRecords()`](/database/fetch#the-record) returns it.

- A new record can take a few seconds to show in the feed.
- Records posted before you subscribed do not appear.
- After you unsubscribe, that user's records leave your feed, past ones included.
