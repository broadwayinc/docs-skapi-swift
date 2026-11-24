# Version History

### Current version: 2.5.0

```swift
.package(url: "https://github.com/broadwayinc/skapi-swift.git", from: "2.5.0")
```

**2.5.0**

skapi-swift 2.5.0 has the record changes of skapi-js 2.6.0 and skapi-py 2.5.0.

New:

- **`source["can_modify_referencing_records"]`.** A record posted with `"source": ["can_modify_referencing_records": true]` lets its uploader change the `data`, `tags` and `index` of other users' records that reference it, or unlink them with `"reference": .null`, with [`postRecord`](/api-reference/database#postrecord) and the record's `record_id`. Nothing else of such a record can be changed this way, and private and read-only records are refused. The uploader can set it only when the record is created and can turn it off at any time; only the project owner and admins in access group `99` can turn it on for an existing record. A value other than a bool throws `INVALID_PARAMETER` (`"source.can_modify_referencing_records" should be type: <boolean>.`). Records come back with `source["can_modify_referencing_records"]` (`false` by default). See [Modifying referencing records](/database/reference#modifying-referencing-records).
- **`record["updated_by"]`**: the user ID of whoever made the record's last update when that was not its uploader (the referenced record's uploader, the project owner or an admin). Absent when the uploader made the last update. It is never listed in `source`. See [Who changed a record](/database/reference#who-changed-a-record-updated-by).
- A redacted `ip` reads as `""` (see below); `readonly`, `unique_id` and the `anonymous:` prefix of `user_id` read as before. A missing `ip` reads as `""` as well.
- `skapiVersion` reads `"2.5.0"`.

Fixes and changes on the server, for every SDK version:

- **A record's IP address is returned only to its uploader, the project owner and admins in access group `99`.** Everyone else reads `ip` as `""`, or `"0.0.0.0"` for a record a signed-out user posted from an IPv4 address, so its `user_id` still starts with `anonymous:`. See [The record](/database/fetch#the-record).
- **`"reference": .null` no longer lets a record into a higher access group.** A user can post a record in an access group above their own only when the request references a record (a reply to a record in that group). Unlinking with `"reference": .null`, or an update that keeps the record's reference but moves it to another access group, throws `User has no access to this group.` like any other post above the user's access group.
- **A record that stops referencing a record leaves its lists.** After its reference is removed or changed, it is no longer returned by [`getRecords`](/api-reference/database#getrecords) with the old `reference` (tag and private record reads included), nor by the old referenced record's uploader's [`getFeed`](/api-reference/users#getfeed).
- **Record files of type HTML, SVG, XML or JavaScript are downloaded instead of opened as pages.** Files attached to records are served with headers that keep a browser from running them. Images, video, audio and PDFs are not affected.

**2.4.4**

skapi-swift 2.4.4 matches skapi-js 2.4.4 and skapi-py 2.4.4. There was no skapi-swift 2.4.1 to 2.4.3 release.

- **A stalled file upload fails with `TIMEOUT` (`Upload timeout: ...`) instead of `NETWORK_ERROR`.** The limit was already how long a request goes with nothing moving, not its total time, so a slow upload that keeps moving is never cut off.
- **A request that stops moving fails with `TIMEOUT`.** When nothing is sent or received for `timeout` seconds, a call now throws `TIMEOUT` (`No response for 120 seconds.` with the default) instead of `NETWORK_ERROR`, so you can tell a dead connection from no connection. See [Errors](/introduction/errors).
- **Polling intervals under 1 second are refused.** The `poll` option of [`forwardRequest`](/api-reference/api-bridge#forwardrequest), the `poll` of [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) and the `poll` option of [`forwardRequestStream`](/api-reference/api-bridge#forwardrequeststream) now throw `INVALID_PARAMETER` (`"poll" should be a number of milliseconds, 1000 or more.`) for a value under `1000`; before, any number of 0 or more was accepted. `poll: 0` on [`forwardRequest`](/api-reference/api-bridge#forwardrequest) still means "do not poll", and `0` on [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) still means the default, 1000. The same rule as skapi-js 2.4.4.
- `skapiVersion` reads `"2.4.4"`.

skapi-js 2.4.3 (signed-out reads no longer sign out) and the 2.4.4 request queue change need nothing here: skapi-swift never signed out on a read, and it sends each request on its own instead of through a page-wide queue.

**2.4.0**

- First release of skapi-swift, the Swift version of skapi-js 2.4.0 and skapi-py 2.4.0.
