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
