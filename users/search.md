# Searching Users

Signed-in users can look up other users of your project with [`getUsers(_:fetchOptions:)`](/api-reference/users#getusers). Only the profile fields each user made public come back.

```swift
let result = try await skapi.getUsers()
for u in result["list"]?.array ?? [] {
    print(u["user_id"]?.string ?? "", u["name"]?.string ?? "")
}
```

Without parameters, `getUsers()` lists every user, newest sign-up first.

## Search by one field

Pass `searchFor` (the field), `value`, and optionally `condition` or `range`:

```swift
// names starting with "Baksa" (">=" on text means "starts with")
try await skapi.getUsers(["searchFor": "name", "condition": ">=", "value": "Baksa"])

// users who signed up before 2023-01-01 (timestamp in milliseconds)
try await skapi.getUsers(["searchFor": "timestamp", "condition": "<", "value": 1672531200000])

// birthdays between 1985 and 1990
try await skapi.getUsers(["searchFor": "birthdate", "value": "1985-01-01", "range": "1990-12-31"])

// several users at once by their IDs (or e-mails)
try await skapi.getUsers(["searchFor": "user_id", "value": ["<user id>", "<another user id>"]])
```

| `searchFor` | value type |
|---|---|
| `user_id` | user ID string |
| `email`, `phone_number`, `name`, `address`, `gender`, `approved` | string |
| `birthdate` | `"YYYY-MM-DD"` |
| `locale` | country code, such as `"US"` |
| `timestamp` (sign-up time, ms), `subscribers`, `access_group` | number |

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` (or `"gt"`, `"gte"`, `"eq"`, `"lt"`, `"lte"`). A `range` searches from `value` to `range` and cannot be combined with a condition. An array of values works only with `"="` and no range.

A field a user did not make public cannot be searched, and is not in their result.

## Paging

`getUsers()` takes the same paging options as [`getRecords()`](/database/fetch#paging): `limit`, `fetchMore`, `ascending`.

```swift
let query: JSON = ["searchFor": "timestamp", "condition": ">", "value": 0]
var page = try await skapi.getUsers(query, fetchOptions: FetchOptions(limit: 50))
while true {
    for u in page["list"]?.array ?? [] {
        print(u["user_id"]?.string ?? "")
    }
    if page["endOfList"]?.bool != false { break }
    page = try await skapi.getUsers(query, fetchOptions: FetchOptions(limit: 50, fetchMore: true))
}
```
