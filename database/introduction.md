# Tables and Access Groups

Every record lives in a **table**, in one **access group**. There is no schema to set up: a table is created by its first record and goes away when its last record is deleted.

A table is always written as an object with its name and its access group:

```swift
["name": "posts", "access_group": "public"]
```

Table names are 1 to 256 characters long, with no control characters. `/`, `!`, `*`, `#` and `%` count as 3 characters each.

::: warning
Writing the table as a plain string, `"table": "posts"`, is deprecated in [getRecords](/api-reference/database#getrecords) and [deleteRecords](/api-reference/database#deleterecords). It still means the `public` records of that table. Always write `["name": ..., "access_group": ...]`.
:::

## Access groups

| `access_group` | Same as | Who can read the records |
|---|---|---|
| `"public"` | `0` | Anyone, signed in or not. |
| `"authorized"` | `1` | Any signed-in user. |
| `2` to `98` | | Users whose own access group is that number or higher. |
| `"admin"` | `99` | Admins and the project owner. |
| `"private"` | `"*"` | The uploader, and the users they [grant access](/database/private) to. |

A user reads records in access groups up to their own, which is the `access_group` in their profile (`await skapi.user?["access_group"]?.int`). The project owner sets it on skapi.com. Records come back with `"public"`, `"authorized"`, `"admin"`, `"private"` or the number.

One table can hold records in several access groups. A query reads one table in one access group at a time:

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let publicNotes = try await skapi.getRecords(["table": ["name": "notes", "access_group": "public"]])
let memberNotes = try await skapi.getRecords(["table": ["name": "notes", "access_group": "authorized"]])
```

## Who can write

**Signed-out callers** can create records in `"public"` only, and must write `"access_group": "public"` (or `0`). Otherwise:

| They try to | code | message |
|---|---|---|
| name another access group | `INVALID_PARAMETER` | `Unsigned users have no access to records with access group.` |
| leave `access_group` out | `INVALID_REQUEST` | `Public users can only post records to public tables.` |
| update a record | `INVALID_REQUEST` | `Public users cannot update existing records.` |
| set a `unique_id` | `INVALID_REQUEST` | `Public users cannot set unique_id for records.` |
| remove files | `INVALID_REQUEST` | `Public users cannot remove files from records.` |

They cannot delete records either: [deleteRecords](/api-reference/database#deleterecords) needs a signed-in user. A record they create has a `user_id` that starts with `anonymous:`. It is temporary and names no user.

**Signed-in users** can post records to any access group up to their own, and to `"private"`. Above their own access group, a record must reference a record they were [granted private access](/database/private) to, and go no higher than that record's access group: see [References](/database/reference). They can update and delete only their own records, and not [read-only](/database/create#read-only-records) ones. Admins can delete any record.

## Reading while signed out

A signed-out caller can read only `"public"` records. Naming any other access group throws `INVALID_PARAMETER`: `Unsigned users have no access to records with access group.`

### Require Login

When the project's **Require Login** setting is on (in the project settings on skapi.com), [getRecords](/api-reference/database#getrecords) refuses signed-out callers before anything is sent:

```swift
do {
    let posts = try await skapi.getRecords(["table": ["name": "posts", "access_group": "public"]])
} catch let err as SkapiError where err.code == "REQUIRE_LOGIN" {
    print("Sign in first")
}
```

The message is `This project requires users to sign in before reading its database, so "getRecords" is not available to a signed-out visitor.` Signed-in users are not affected, and neither are [getTables, getTags, getIndexes and getUniqueId](/database/index-tags#table-tag-and-index-information). The setting is a guard in the SDK, not an access rule on the server: data that must stay hidden from signed-out callers belongs in an access group above `"public"`.

## Next

- [Creating Records](/database/create)
- [Fetching Records](/database/fetch)
- [Private Records](/database/private)
