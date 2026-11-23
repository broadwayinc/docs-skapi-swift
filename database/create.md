# Creating Records

[postRecord(_:config:files:)](/api-reference/database#postrecord) creates a record, or [updates one](/database/update-delete) when the config has a `record_id`. It returns the saved record (see [The record](/database/fetch#the-record)).

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let record = try await skapi.postRecord(
    ["title": "Hello", "body": "My first post"],                     // data
    config: ["table": ["name": "posts", "access_group": "public"]]   // config
)
print(record["record_id"]?.string ?? "", record["data"]?["title"]?.string ?? "")
```

## data

`data` is any [`JSON`](/introduction/getting-started#json-values) value: an object, an array, a string, a number, a boolean, or `.null`.

- **Left out** (or `nil`), the stored data is kept. This only matters on an update: `skapi.postRecord(config: [...])`.
- **`.null`** stores `null`.
- **Up to 2 MB** as JSON. More throws `INVALID_REQUEST`: `Data should not exceed 2MB`.

Data larger than 32 KB is kept in file storage instead of the database. You do not have to do anything about it: reading the record gives back the value you posted.

The key `__skapi__` at the top of an object is reserved: it is where Skapi features read their settings, and Skapi reads nothing else of your data. Today one feature uses it: [link previews](https://docs.skapi.com/hosting/hosting.html#link-previews) of a hosted site read `__skapi__.og` of a record in the `public` access group (`title`, `description`, `image`: the name of an image file attached to the record, `url`: a path on the site), to show its title and picture when `https://<name>.skapi.com/__skapi__/og/<record_id>` is shared. Keep your own fields outside `__skapi__`.

```swift
let card = try await skapi.postRecord(
    ["photo": 42, "__skapi__": ["og": ["title": "Sunset over the bay", "image": "preview", "url": "/index.html#photo=42"]]],
    config: ["table": ["name": "share_cards", "access_group": "public"]]
) // then attach the picture as the file "preview"
```

Your own `Codable` types go in with `try JSON(encoding: value)`, see [Codable types](/introduction/getting-started#codable-types).

## config

| key | type | |
|---|---|---|
| `table` | object | `["name", "access_group"]`. Required when creating. A left-out `access_group` means `"public"` when creating (signed-out callers must write it), and keeps the record's group when updating. See [access groups](/database/introduction#access-groups). |
| `record_id` | string | Update this record instead of creating one. A unique ID works too. |
| `unique_id` | string or `.null` | Your own ID for the record, unique in the project. `.null` removes it on an update. See [Unique IDs](/database/index-tags#unique-ids). |
| `readonly` | bool | `true` makes the record unchangeable. |
| `index` | object or `.null` | `["name", "value"]`, one searchable value: a string, number or bool. `.null` removes it. See [Indexes](/database/index-tags). |
| `tags` | array of strings, or a comma-separated string | Labels to search by. `[]` removes them on an update. See [Tags](/database/index-tags#tags). |
| `reference` | string, object or `.null` | The record ID or unique ID of a record this one refers to. `.null` removes it. See [References](/database/reference). |
| `source` | object | Rules for records that reference this one. See [Reference rules](/database/reference#reference-rules). |
| `remove_bin` | array or `.null` | Updates only: files to take off the record. See [Files](/database/files#removing-files). |

`files:` attaches files. See [Files](/database/files).

## Read-only records

```swift
let rec = try await skapi.postRecord(
    ["order": 1042, "total": 59.0],
    config: ["table": ["name": "orders", "access_group": "private"], "readonly": true]
)
```

A read-only record cannot be updated or deleted by its uploader. An update throws `INVALID_REQUEST`: `Record is read only.`

## Tags, index and unique ID

```swift
try await skapi.postRecord(
    ["title": "Getz/Gilberto", "artist": "Stan Getz, Joao Gilberto"],
    config: [
        "table": ["name": "albums", "access_group": "public"],
        "unique_id": "album:getz-gilberto",
        "index": ["name": "year", "value": 1964],
        "tags": ["jazz", "bossa nova"],
    ]
)
```

Each record has at most one index and any number of tags. How to query them is in [Indexes, Tags and Unique IDs](/database/index-tags).

## Reference and source

```swift
let post = try await skapi.postRecord(
    ["text": "What do you think?"],
    config: ["table": ["name": "posts", "access_group": "public"],
             "source": ["prevent_multiple_referencing": true]]
)

try await skapi.postRecord(
    ["text": "I like it"],
    config: ["table": ["name": "comments", "access_group": "public"],
             "reference": post["record_id"] ?? .null]
)
```

See [References](/database/reference).

## Many records at once

[postRecords(_:)](/api-reference/database#postrecords) takes an array of `["data", "config"]` items and saves them 100 to a request. A thousand rows are ten requests instead of a thousand.

```swift
let items: [JSON] = rows.map { row in
    ["data": row, "config": ["table": ["name": "imports", "access_group": "public"]]]
}
let result = try await skapi.postRecords(items)

print(result["list"]?.array?.count ?? 0, "saved")
for f in result["failed"]?.array ?? [] {
    print(f["index"]?.int ?? -1, f["code"]?.string ?? "", f["message"]?.string ?? "")
}
```

```json
{
  "list": [record, ...],
  "failed": [
    {"index": 7, "code": "INVALID_PARAMETER", "message": "..."}
  ]
}
```

`list` holds the saved records in the order given, and `failed` the items that were not saved, by position. Each item follows the rules of `postRecord`, with the same config keys. A refused item does not stop the others, and the counts of `list` and `failed` add up to the number of items. Only a failed request (network, sign-in, a server error) throws; records saved by earlier requests stay saved. `postRecords` does not attach files: use [uploadFiles](/database/files#adding-files-to-an-existing-record) on the saved records.
