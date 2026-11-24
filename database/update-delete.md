# Updating and Deleting

## Updating a record

Call [postRecord](/api-reference/database#postrecord) with the record's `record_id` in the config. Only the keys you send change; everything else on the record stays as it is. You must be signed in, and the record must be yours.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let rec = try await skapi.postRecord(
    ["title": "Hello again", "body": "Edited"],  // replaces the stored data
    config: ["record_id": "<record id>"]
)
```

`record_id` also takes the record's [unique ID](/database/index-tags#unique-ids).

### Keeping or replacing the data

| You pass | The stored data |
|---|---|
| a value | is replaced by it, whole. Keys you leave out of the new object are gone. |
| nothing (`config:` only), or `nil` | is kept. |
| `.null` | becomes `null`. |

To change only the config, leave `data` out:

```swift
try await skapi.postRecord(config: [
    "record_id": "<record id>",
    "tags": ["featured"],
])
```

::: warning
`skapi.postRecord(.null, config: [...])` is not the same: it overwrites the data with `null`. A Swift `nil` (the argument left out) keeps the data; `JSON.null` replaces it.
:::

### Removing things

| To remove | Send |
|---|---|
| the index | `"index": .null` |
| every tag | `"tags": .null` |
| the reference | `"reference": .null` |
| the unique ID | `"unique_id": .null` |
| some files | `"remove_bin": [file or url, ...]`, see [Files](/database/files#removing-files) |
| every file | `"remove_bin": .null` |

Inside a `JSON` literal, `nil` means `null` too, so `"index": nil` works the same as `"index": .null`.

### Moving between access groups

A `table` without `access_group` keeps the record where it is. Name the group to move it:

```swift
try await skapi.postRecord(config: [
    "record_id": "<record id>",
    "table": ["name": "notes", "access_group": "authorized"],
])
```

Moving a record into or out of `"private"` removes every [private access grant](/database/private) on it, and only the record's uploader can do it.

### Refusals

| code | message | when |
|---|---|---|
| `INVALID_REQUEST` | `User has no access to update this record.` | the record is someone else's |
| `INVALID_REQUEST` | `Record is read only.` | the record was created with `readonly: true` |
| `INVALID_REQUEST` | `Public users cannot update existing records.` | you are signed out |

The uploader of a record posted with `source["can_modify_referencing_records"] = true` can also change the `data`, `tags` and `index` of other users' records that reference it, or unlink them with `"reference": .null`. See [Modifying referencing records](/database/reference#modifying-referencing-records). When someone other than its uploader made a record's last update, the record has `updated_by`, that user's ID.

## Deleting records

[deleteRecords(_:fetchOptions:)](/api-reference/database#deleterecords) needs a signed-in user. Files attached to a deleted record are deleted with it.

```swift
// one record
try await skapi.deleteRecords(["record_id": "<record id>"])

// up to 1000 at once
try await skapi.deleteRecords(["record_id": ["<id 1>", "<id 2>", "<id 3>"]])

// by unique ID (also an array of up to 1000)
try await skapi.deleteRecords(["unique_id": "album:getz-gilberto"])

// every record you uploaded to the public group of "drafts"
try await skapi.deleteRecords(["table": ["name": "drafts", "access_group": "public"]])
```

A delete by query takes the same keys as [getRecords](/database/fetch): `table`, `index`, `tag`, `reference`. It deletes only your own records, skips read-only ones, and leaves the table's other access groups alone. It returns the server's message, such as `SUCCESS: records are being deleted. please give some time to finish the process.`, and a large delete can take a moment to show in later reads.

An empty `record_id` or `unique_id` (`""` or `[]`) throws `INVALID_PARAMETER`: `"record_id" is empty.` More than 1000 IDs throws `"record_id" can hold at most 1000 ids.`

::: danger
On a string index value, `condition: "<="` means **ends with**. Run the same query through `getRecords` first and check the list before you delete with it.
:::

Admins can delete any record, private and read-only ones included.
