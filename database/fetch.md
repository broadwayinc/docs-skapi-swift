# Fetching Records

[getRecords(_:fetchOptions:)](/api-reference/database#getrecords) reads records. It takes a query and optional fetch options, and returns an object:

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let result = try await skapi.getRecords(
    ["table": ["name": "posts", "access_group": "public"]],
    fetchOptions: FetchOptions(limit: 20)
)

for record in result["list"]?.array ?? [] {
    print(record["record_id"]?.string ?? "", record["data"] ?? .null)
}
```

```json
{
  "list": [record, ...],
  "startKey": {...},
  "endOfList": false,
  "startKeyHistory": [...]
}
```

`startKey` is `"end"` on the last page.

## What a query needs

Each query reads by **one** of these:

| You give | `table` |
|---|---|
| `record_id` or `unique_id` | Not needed. Returns that one record. |
| `reference` to a record, signed in | Not needed: searches every table. Add a `table` to read one table and group. |
| `reference` to a user ID, signed in | Not needed for your own ID. Needed for another user's. |
| nothing else, `index` or `tag` | **Required**, with `name` and `access_group`. |

A `table` without `access_group` throws `INVALID_PARAMETER`: `"table.access_group" is required: ...`. A query that needs a table and has none throws `Key "table" is required.`

## By record ID or unique ID

```swift
let rec = try await skapi.getRecords(["record_id": "<record id>"])["list"]?[0]
let album = try await skapi.getRecords(["unique_id": "album:getz-gilberto"])["list"]?[0]
```

Every other key is ignored, and `record_id` wins when both are given. A missing record throws `NOT_EXISTS` (`Record does not exists.` or `Unique ID does not exists.`). A record you may not read throws `INVALID_REQUEST`: `No access to the record.`, or `User has no private access.` for a [private](/database/private) one.

## From a table

```swift
let result = try await skapi.getRecords(["table": ["name": "posts", "access_group": "authorized"]])
```

Access groups other than `"public"` need a signed-in user. See [Tables and Access Groups](/database/introduction).

## By index

```swift
try await skapi.getRecords([
    "table": ["name": "albums", "access_group": "public"],
    "index": ["name": "year", "value": 1960, "condition": ">="],
])

try await skapi.getRecords([
    "table": ["name": "albums", "access_group": "public"],
    "index": ["name": "year", "value": 1960, "range": 1969],
])
```

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` or `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`. `range` reads from `value` to `range`, both included, and must be the same type as `value`. If both are given, `range` is dropped and `condition` is used. Strings, compound names and the special `$` indexes are in [Indexes](/database/index-tags#querying-an-index).

## By tag

```swift
try await skapi.getRecords([
    "table": ["name": "albums", "access_group": "public"],
    "tag": "jazz",
])
```

The tag matches exactly. It can be combined with `index`. To read records with one tag **or** another, query each tag and merge the lists by `record_id`.

## By reference

```swift
// every record that references a post, in every table this user can read
try await skapi.getRecords(["reference": "<record id or unique id>"])

// only the comments, in one access group
try await skapi.getRecords([
    "table": ["name": "comments", "access_group": "public"],
    "reference": "<record id or unique id>",
])

// records a user uploaded to a table
try await skapi.getRecords([
    "table": ["name": "comments", "access_group": "public"],
    "reference": "<user id>",
])
```

`reference` can also be an object: `["record_id": ...]`, `["unique_id": ...]` or `["user_id": ...]`. Signed-out callers always need `table`. Which records come back is in [References](/database/reference#fetching-references).

## Paging

`fetchOptions:` takes a `FetchOptions`:

| field | |
|---|---|
| `limit` | Records per call. Default 50, at most 1000. |
| `fetchMore` | `false` (default) always returns the first page. `true` returns the page after the last one this object fetched for the same query. |
| `ascending` | `true` (the server's default) or `false` for the reverse order. |
| `startKey` | Start from this key, taken from an earlier result. `"start"` starts over. |

```swift
let query: JSON = ["table": ["name": "posts", "access_group": "public"]]

var page = try await skapi.getRecords(query, fetchOptions: FetchOptions(limit: 100))
handle(page["list"])

while page["endOfList"]?.bool == false {
    page = try await skapi.getRecords(query, fetchOptions: FetchOptions(limit: 100, fetchMore: true))
    handle(page["list"])
}
```

`endOfList` is `true` on the last page, and `startKey` is then `"end"`. Asking for more after that returns an empty list. Fetch only what you need instead of walking a whole table: in a list view, load the next page when the user scrolls near the end.

The same options work on [getTables](/api-reference/database#gettables), [getTags](/api-reference/database#gettags), [getIndexes](/api-reference/database#getindexes), [getUniqueId](/api-reference/database#getuniqueid) and [listPrivateRecordAccess](/api-reference/database#listprivaterecordaccess).

## The record

Every record comes back as an object:

```json
{
  "record_id": "...",
  "user_id": "...",
  "unique_id": "album:getz-gilberto",
  "table": {"name": "albums", "access_group": "public", "subscription": {...}},
  "data": {...},
  "index": {"name": "year", "value": 1964},
  "tags": ["jazz"],
  "reference": "...",
  "source": {
    "referencing_limit": null,
    "prevent_multiple_referencing": false,
    "can_remove_referencing_records": false,
    "can_modify_referencing_records": false,
    "only_granted_can_reference": false
  },
  "referenced_count": 0,
  "readonly": false,
  "uploaded": 1731600000000,
  "updated": 1731600000000,
  "ip": "203.0.113.7",
  "bin": {"cover": [file, ...]}
}
```

| key | |
|---|---|
| `user_id` | the uploader |
| `unique_id`, `index`, `tags`, `reference` | only when set; `reference` is the record ID this record references |
| `data` | what was posted |
| `referenced_count` | how many records reference this one |
| `uploaded`, `updated` | milliseconds |
| `ip` | the uploader's IP address, returned only to the uploader, the project owner and admins in access group `99`. Anyone else reads `""`, or `"0.0.0.0"` for a record a signed-out user posted from an IPv4 address (its `user_id` still starts with `anonymous:`). One posted from an IPv6 address reads `""`, and its `user_id` has no `anonymous:` prefix, as before. |
| `updated_by` | only when someone other than the uploader made the last update: that user's ID. See [Who changed a record](/database/reference#who-changed-a-record-updated-by). |
| `bin` | attached files, see [Files](/database/files#files-on-a-record) |

Each entry in `bin` is an object with `access_group`, `filename`, `url`, `path`, `size` and `uploaded`.

To work with your own types, decode `data`: `try record["data"]?.decode(Post.self)`.
