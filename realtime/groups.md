# Groups and Messages

## Sending to a user

Pass a user ID as the recipient. The user receives a `"private"` event on any connection they have open, whatever group they are in:

```swift
try await skapi.postRealtime(["text": "Hi!"], recipient: "<user id>")
```

The message is any [`JSON`](/introduction/getting-started#json-values) value. With its headers it can be at most 32 KB (32768 bytes); a bigger one throws `INVALID_PARAMETER` without sending.

## Joining a group

```swift
try await skapi.joinRealtime(group: "lobby")
```

```json
{"type": "success", "message": "Joined realtime message group: \"lobby\"."}
```

A connection is in one group at a time: joining another group leaves the current one. The members get a `"notice"` with `USER_JOINED` when you join and `USER_LEFT` when you leave.

```swift
try await skapi.joinRealtime(group: nil)   // leaves the group
```

## Sending to the group

Pass the group's name as the recipient. Every member, you included, receives a `"message"` event:

```swift
try await skapi.postRealtime(["text": "Hello everyone"], recipient: "lobby")
```

You can only post to the group you joined; any other group name throws `INVALID_REQUEST`: `User has not joined to the recipient group. Run joinRealtime(group: "<group>")`.

The first post right after joining waits, at most 3 seconds, until the server confirms the join, so the group does not miss it.

### Message order

Messages one sender posts to a group arrive in the order they were sent. Posts made less than 100 milliseconds apart are sent together in one frame and still arrive one by one, in order. A post 100 milliseconds or more after the one before goes at once.

### Notifications

A message can carry a push notification for recipients who use the project in a web browser with skapi-js:

```swift
try await skapi.postRealtime(
    ["text": "Dinner is ready"],
    recipient: "<user id>",
    notification: ["title": "New message", "body": "Dinner is ready", "config": ["always": true]]
)
```

`title` and `body` are required strings, together at most 3 KB. By default the notification is sent only to recipients who are not connected; `"always": true` sends it to everyone. A message with a notification is never sent together with other posts. The notification is a web push: it does not reach the iOS or macOS app itself (see [Not Included](/introduction/not-included)).

## Listing groups

[getRealtimeGroups(_:fetchOptions:)](/api-reference/realtime#getrealtimegroups) lists the groups that have members right now:

```swift
try await skapi.getRealtimeGroups()
// {"list": [{"group": "lobby", "number_of_users": 3}, ...], "startKey": ..., "endOfList": true}

try await skapi.getRealtimeGroups(["searchFor": "group", "value": "lob", "condition": ">="])
try await skapi.getRealtimeGroups(["searchFor": "number_of_users", "value": 10, "condition": ">="])
```

## Listing users in a group

[getRealtimeUsers(_:fetchOptions:)](/api-reference/realtime#getrealtimeusers) lists the connections in a group, by default the one you joined:

```swift
try await skapi.getRealtimeUsers()
// {"list": [{"user_id": "...", "cid": "cid:..."}, ...], ...}

try await skapi.getRealtimeUsers(["group": "lobby", "user_id": "<user id>"])   // one user's connections there
```

A user with two devices connected appears twice, with two `cid`s.
