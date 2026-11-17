# Private Records

A record in the `"private"` access group (`"*"` for short) can be read only by its uploader and by the users the uploader grants access to.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let rec = try await skapi.postRecord(
    ["note": "Only for me and my doctor"],
    config: ["table": ["name": "health", "access_group": "private"]]
)
let recordId = rec["record_id"]?.string ?? ""
```

To keep its `data` unreadable to the server as well, see [Encrypting Private Data](/database/encryption).

Anyone else who fetches it gets `INVALID_REQUEST`: `User has no private access.` The project owner and admins read a private record only on the same terms as any other user.

A private record that **references** another record can also be read by the users with private access to that other record: its uploader and the users it was shared with. See [References](/database/reference#fetching-references).

## Granting access

[grantPrivateRecordAccess(_:)](/api-reference/database#grantprivaterecordaccess) shares one record with up to 100 users at a time. Only the record's uploader can grant, unless the record was posted with `"source": ["allow_granted_to_grant_others": true]`.

```swift
try await skapi.grantPrivateRecordAccess([
    "record_id": .string(recordId),
    "user_id": ["<user id 1>", "<user id 2>"],   // or one user ID as a string
])
```

A granted user can read the record, even when it is private or above their own access group, and every record that references it. They can also [reference](/database/reference) it.

## Removing access

```swift
try await skapi.removePrivateRecordAccess([
    "record_id": .string(recordId),
    "user_id": "<user id>",
])
```

The user cannot get a new private access key for the record after this. A key they already hold keeps working until it expires, so they lose access to the record and its files **within 1 hour** at most (see [Private files](#private-files)).

## Listing grants

[listPrivateRecordAccess(_:fetchOptions:)](/api-reference/database#listprivaterecordaccess) takes `record_id`, `user_id`, or both (at least one):

```swift
// who can read this record
try await skapi.listPrivateRecordAccess(["record_id": .string(recordId)])

// which records this user was granted
try await skapi.listPrivateRecordAccess(["user_id": "<user id>"])
```

```json
{"list": [{"record_id": "...", "user_id": "..."}], "startKey": "...", "endOfList": true}
```

It takes the [paging options](/database/fetch#paging) as `fetchOptions:`.

## Moving in and out of private

Moving a record into or out of `"private"` removes **every** grant on it, in either direction. Grant again afterwards if those users should keep access. Only the record's uploader can move it across that line.

```swift
try await skapi.postRecord(config: [
    "record_id": .string(recordId),
    "table": ["name": "health", "access_group": "authorized"],   // clears the grants
])
```

## Private files

Files on a private record are private too. Their uploader and granted users read them with [getFile](/database/files#downloading-files) as usual: skapi-swift asks the server for a private access key and adds it to the file request. The key is kept on the `Skapi` object and reused for that record.

A private access key is valid for **1 hour**. skapi-swift renews it on its own: a key that has expired, or will within a minute, is replaced with a fresh one the next time it is needed.

[requestPrivateRecordAccessKey(_:)](/api-reference/database#requestprivaterecordaccesskey) is that request on its own. You only need it to build file requests yourself:

```swift
let key = try await skapi.requestPrivateRecordAccessKey(["record_id": .string(recordId)])
```

When your access comes from a record that the private record references, pass that record's ID as `reference_id`.

To hand a private file to someone without an account, make a [signed link](/database/files#links-that-work-without-sign-in) with `expires:`.
