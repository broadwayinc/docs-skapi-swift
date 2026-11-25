# References

A record can **reference** one other record. Comments on a post, votes on a poll, items in an order: the child records reference the parent, and you fetch them by the parent's ID.

## Referencing a record

Put the parent's record ID or unique ID in `reference`:

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let post = try await skapi.postRecord(
    ["text": "What do you think of this?"],
    config: ["table": ["name": "posts", "access_group": "public"], "unique_id": "post:1"]
)

try await skapi.postRecord(
    ["text": "I like it"],
    config: ["table": ["name": "comments", "access_group": "public"],
             "reference": post["record_id"] ?? .null]   // or "post:1"
)
```

`reference` also takes an object, `["record_id": ...]` or `["unique_id": ...]`. The saved record has the parent's record ID in `record["reference"]`, and the parent's `referenced_count` goes up by one.

To remove a reference, update the record with `"reference": .null`:

```swift
try await skapi.postRecord(config: ["record_id": "<comment id>", "reference": .null])
```

A user cannot reference a record in a higher access group than their own, or a private record, unless the uploader [granted them private access](/database/private) to it.

A referencing record can sit in an access group above the user's own only when the user was granted private access to the referenced record, and only up to the referenced record's access group. Being able to read the referenced record, or having uploaded it, is not enough: a reference to a `"public"` record, or to a private one, lets no record above the user's own access group. Admins and the project owner post in any access group. Otherwise it throws `INVALID_REQUEST` with `User has no access to this group. A record above your access group must reference a record you were granted, and stay at or below that record's access group.` (or, when the referenced record is private, `User has no access to this group. A private record lends no access group: a record that references it can be at most your own access group, or private.`) The same check runs on every update of such a record, also one that does not send `"reference"` again: once the user holds no grant on the referenced record, they can update the record only by moving it to an access group up to their own.

## Fetching references

```swift
// the comments of a post, in one table and one access group
try await skapi.getRecords([
    "table": ["name": "comments", "access_group": "public"],
    "reference": "post:1",
])

// every record that references the post, in every table (signed in only)
try await skapi.getRecords(["reference": "post:1"])
```

Without `table`, what comes back depends on who asks:

| The caller | The list holds |
|---|---|
| uploaded the referenced record, or was granted private access to it | **every** record that references it, in every access group, private ones included |
| anyone else | referencing records in access groups up to their own; no private records |

Signed-out callers always need `table`. One call without `table` replaces one call per table, so prefer it to looping over tables.

A user ID in `reference` returns that user's records: your own in every table, or another user's in the `table` you name.

```swift
try await skapi.getRecords([
    "table": ["name": "comments", "access_group": "public"],
    "reference": "<user id>",
])
```

Sorting by the number of references, for example the posts with the most comments, uses the [`$referenced_count` index](/database/index-tags#special-indexes).

## Reference rules

`source` in the config of the **parent** sets rules for the records that reference it:

| key | |
|---|---|
| `referencing_limit` | How many records may reference this one. `.null` (default) is no limit, `0` allows none. |
| `prevent_multiple_referencing` | `true`: each user may reference it only once. Good for votes. |
| `can_remove_referencing_records` | `true`: the uploader may delete records that reference it, and deleting it deletes them too. Good for a post owner removing comments. |
| `can_modify_referencing_records` | `true`: the uploader may change the `data`, `tags` and `index` of records that reference it, or unlink them. Set it when the record is created. See [Modifying referencing records](#modifying-referencing-records). |
| `only_granted_can_reference` | `true`: only users with [private access](/database/private) may reference it. |
| `allow_granted_to_grant_others` | `true`: users with private access may grant it to others. |
| `referencing_index_restrictions` | An array of index rules the referencing records must meet, see below. |

### Index restrictions

Each rule is an object with `name` (required), and optionally `value` and `condition`. A referencing record must have an index with that name, of the same type as `value`, that meets the condition (`"="` when left out). The conditions are `"="`, `"!="`, `">"`, `">="`, `"<"`, `"<="` and the word forms `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.

A review board where 10 people can each rate once, below 5:

```swift
try await skapi.postRecord(
    ["title": "Rate the album Getz/Gilberto"],
    config: [
        "table": ["name": "reviews", "access_group": "public"],
        "unique_id": "reviews:getz-gilberto",
        "source": [
            "referencing_limit": 10,
            "prevent_multiple_referencing": true,
            "referencing_index_restrictions": [
                ["name": "rating", "value": 5, "condition": "<"],
            ],
        ],
    ]
)

try await skapi.postRecord(
    ["comment": "Wonderful"],
    config: [
        "table": ["name": "reviews", "access_group": "public"],
        "reference": "reviews:getz-gilberto",
        "index": ["name": "rating", "value": 4.5],
    ]
)
```

Use a number for the rating so [getIndexes](/database/index-tags#getindexes) can report the total and average.

`referencing_limit` must be a number from 0 up, or `.null`. A rule with a `range` key is refused (`INVALID_PARAMETER`: `Index restriction "range" type should match the type of "value".`), so express ranges with `condition`.

::: warning
A user with private access to a record can read every record that references it, private ones included. If that is not what you want, do not let users post private records that reference other records.
:::

## Modifying referencing records

By default only the user who uploaded a record can change it. Post a record with `source["can_modify_referencing_records"] = true`, and its uploader can also change the records other users post referencing it: a post's author moderating its comments, a thread's author marking the answers, or a form's author updating the status of each submission.

```swift
// The post: its uploader may change the comments that reference it.
try await skapi.postRecord(
    ["title": "What do you think?"],
    config: [
        "table": ["name": "posts", "access_group": "public"],
        "source": ["can_modify_referencing_records": true],
    ]
)
```

The post's uploader updates another user's comment with [postRecord](/api-reference/database#postrecord) and the comment's `record_id`, as they would update their own record:

```swift
let comment = try await skapi.postRecord(
    ["comment": "Hidden by the author of the post."],
    config: [
        "record_id": "<record id of the comment>",
        "tags": ["hidden"],
        "index": ["name": "status", "value": "hidden"],
    ]
)
comment["user_id"]?.string     // still the user who posted the comment
comment["updated_by"]?.string  // the post's uploader
```

### What can be changed

On a record that references their post, the post's uploader can change only:

- `data`
- `tags`
- `index`. The post's [index restrictions](#index-restrictions) still apply to the new index while the record references the post.
- `"reference": .null`, which unlinks the record from the post. After that the post's uploader can no longer change it.

```swift
try await skapi.postRecord(config: ["record_id": "<record id of the comment>", "reference": .null])
```

Everything else throws `INVALID_REQUEST` and nothing is written:

| refused | message |
|---|---|
| the table name, the access group, the subscription settings, `readonly`, `unique_id`, any `source` setting, removing every file with `"remove_bin": .null`, or pointing `reference` at another record | `The referenced record's user can only change the data, tags and index of a record that references theirs, or unlink it (<field> differs).` |
| removing files by URL with `remove_bin` (the files belong to the user who posted the record) | `The binary should be owned by the user.` |
| a private record | `The referenced record's user cannot update a private record.` |
| a read-only record | `Record is read only.` |
| a record in an access group above the caller's own | `User has no access to this group.` |

A value sent as it is already stored is not a change, so resending the record's whole config is fine.

Files cannot be attached either, but `postRecord` does not throw for them: the record is saved first, then each file asks for an upload permit, and those permits are refused (`User has no access to update this record.`). So a `postRecord` call that passes `files:` saves its `data`, `tags`, `index` or `reference` change and returns without attaching the files. [uploadFiles](/api-reference/database#uploadfiles) on such a record lists each file in `"failed"`. Do not pass `files:` when changing another user's record.

The record keeps its owner: `user_id` stays the user who posted it, its files stay theirs, and that user can still update or delete it in full.

### When it can be turned on

The setting hands other users' records to the record's uploader, so the users who reference a record must be able to see it before they post. The uploader can therefore set it to `true` only when the record is **created**:

- On an update, the uploader can turn it off (`false`) at any time, but not on. Turning it on for an existing record throws `INVALID_REQUEST`: `"source.can_modify_referencing_records" can only be set when the record is created. Only the project owner and admins in access group 99 can turn it on for an existing record.`
- The project owner and admins in access group `99` can turn it on for an existing record. Admins in access groups `90` to `98` cannot.

The setting comes back in `record["source"]?["can_modify_referencing_records"]`.

### Who changed a record: `updated_by`

When a record was last updated by someone other than its uploader (the referenced record's uploader through this setting, the project owner or an admin), the record has `updated_by`: that user's ID. It is gone once the uploader updates the record again, and a request cannot set it.

The record [postRecord](/api-reference/database#postrecord) returns to the post's uploader after such an update has an empty `ip`, or `"0.0.0.0"` for a record posted by a signed-out user: a record's IP address is returned only to its uploader, the project owner and admins in access group `99`.
