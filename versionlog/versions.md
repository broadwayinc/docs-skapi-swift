# Version History

### Current version: 2.7.0

```swift
.package(url: "https://github.com/broadwayinc/skapi-swift.git", from: "2.7.0")
```

**Server changes of 2026-11-25, for every SDK version**

- **A record above your access group needs a grant.** A record may sit in an access group above its user's own only when it references a record the user was granted with `grantPrivateRecordAccess`, and at most at that record's access group. Being able to read the referenced record, or having uploaded it, is no longer enough: a reference to a public record used to let any signed-in user post into any access group. Refused with `User has no access to this group. A record above your access group must reference a record you were granted, and stay at or below that record's access group.`, or `User has no access to this group. A private record lends no access group: a record that references it can be at most your own access group, or private.` when the referenced record is private. The same check runs on an update that keeps such a record's reference. Admins and the project owner are not checked. See [References](/database/reference).
- **Private access keys through a reference check the link.** A key asked for with a reference is given only when the private record references that record directly, and you uploaded it or were granted it (a grant on the private record itself is enough too). Before, any record of your own could be named, which gave a key to any private record. See [Private records](/database/private).
- **Listing private access grants needs access to the data.** A record's grants are listed only for its uploader, the users it was shared with, the users with private access to the record it references, the project owner and admins in access group `99`; a user's grants only for that user, the project owner and admins in access group `99`. Anyone else gets `User has no access to list the private access of this record.` (or `of this user.`). See [Listing grants](/database/private#listing-grants).
- **A record read through the record it references comes with a key for its own files.** It used to come with the referenced record's key, so its files failed to load for up to an hour.

**2.7.0**

skapi-swift 2.7.0 is aligned with skapi-js 2.7.0 (and its 2.5.0 request status push). There was no 2.5.0 or 2.6.0 release of skapi-swift: 2.7.0 is the first release after 2.4.4.

Fixes:

- **The package builds for macOS and iOS again.** 2.4.4 did not compile on Apple platforms (`invalid redeclaration of 'out'` in CryptoPrimitives.swift, and `reference to captured var 'self' in concurrently-executing code` in Lifecycle.swift with Swift 5.10), so apps could not add it. Both are fixed; checked with Swift 5.10 and 6.4.
- **A passing failure no longer says the project does not exist.** The first call of a Skapi object reads the project's endpoint list from the CDN. Any failed read of it threw `NOT_EXISTS` ("The project ID does not exist"), so a login could fail once with `NOT_EXISTS` and work when tried again. Now only a missing list (the CDN answers 403 or 404) throws `NOT_EXISTS`; a server fault throws `SERVER_ERROR`, a rate limit `RATE_LIMITED`, a cut-off answer `NETWORK_ERROR`, and no answer in time `TIMEOUT`, all safe to try again.
- **Request status frames no longer reach your realtime callback.** The server sends a `CSR_STATUS` frame to every realtime connection of a user whose forwarded request was sent with `notify`, also when another app of the same user (a web app on skapi-js) sent it. skapi-swift handed it to the [connectRealtime](/api-reference/realtime#connectrealtime) callback as a `"private"` event with no sender; it now goes to [onRequestStatus](/api-reference/api-bridge#onrequeststatus) only.
- **Polls survive a bad network.** [forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll), [forwardRequestStream](/api-reference/api-bridge#forwardrequeststream), and [forwardRequest](/api-reference/api-bridge#forwardrequest) with `poll` or `stream` ended with the first failed check. A check that fails on the way (`NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR`, or no sign-in token) is now tried again, waiting twice as long each time up to 30 seconds. A `401` refreshes the token once. While signed out the poll waits for a sign in. Only the server's own answer ends it.
- **Server failures and rate limits are told apart from refusals.** A status of 500 or above (except 501) throws `SERVER_ERROR`, with the server's answer in `cause`, instead of whatever code its body carried. A "too many requests" answer without a wait time throws `RATE_LIMITED` (was `ERROR`); for a file upload it is `TOO_MANY_REQUESTS`. See [Errors](/introduction/errors).
- **A token refresh that gets no answer no longer holds every call.** A call waits at most 15 seconds for it, then throws `TIMEOUT`; the user stays signed in and the next call starts a new refresh. The refresh after a profile change ([updateProfile](/api-reference/authentication#updateprofile), [verifyEmail](/api-reference/authentication#verifyemail), [lastVerifiedEmail](/api-reference/authentication#lastverifiedemail), [getProfile(refreshToken: true)](/api-reference/authentication#getprofile)) waits as long as it takes, as in skapi-js, and a slower refresh that started before the change can no longer bring back the old profile.
- **Cancelling a task takes its request off the network.** The call throws `ABORTED`, also while it waits for a token refresh or a `429` wait time. Before, the request ran on until it finished.
- **The package builds on Linux** with Swift 5.10 (WebSocket send and receive use the async forms).

New:

- **`cref` on [forwardRequest](/api-reference/api-bridge#forwardrequest)**: your own reference for a request, handed back by the reply and every read. See [Finding a request again](/api-bridge/forward-request#finding-a-request-again).
- **[forwardRequestStatus](/api-reference/api-bridge#forwardrequeststatus)**, **[forwardRequestQueueCounters](/api-reference/api-bridge#forwardrequestqueuecounters)** and **[forwardRequestRead](/api-reference/api-bridge#forwardrequestread)**: where many requests stand in one call, the counters of up to 20 queues, and one request in full whatever its state.
- **`ifAbsent` on [forwardRequestFinalize](/api-reference/api-bridge#forwardrequestfinalize)**: store only when no result is stored yet (`{"finalized": false, "reason": "exists"}` otherwise).
- **`fields: "ids"` and `after` on [forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory)**, and `cref` on its rows.
- **`deadline`** (milliseconds, then `TIMEOUT`) on [forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory), [forwardRequestStatus](/api-reference/api-bridge#forwardrequeststatus), [forwardRequestQueueCounters](/api-reference/api-bridge#forwardrequestqueuecounters) and [forwardRequestRead](/api-reference/api-bridge#forwardrequestread). `fresh` is accepted for code shared with skapi-js and changes nothing: skapi-swift never joins a read to another one. skapi-js's `signal` is the task's cancellation (`ABORTED`).
- **Request status push**: `notify` on [forwardRequest](/api-reference/api-bridge#forwardrequest), `notify:` on [forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll), and [onRequestStatus / isRequestStatusLive](/api-reference/api-bridge#onrequeststatus). See [Status push](/api-bridge/forward-request#status-push).
- `SkapiError.isTokenFailure`.
- `skapiVersion` reads `"2.7.0"`.

Changes on the server, for every SDK version:

- **`queue_exact` reads only the named queue on the server.** Requests queued before 2026-06-05 were stored under an older queue format and are not listed with `"queue_exact": true`; list the queue without it to see those. See [Exact queue matching](/api-bridge/forward-request#exact-queue-matching).

**2.5.0**

skapi-swift 2.5.0 has the record changes of skapi-js 2.6.0 and skapi-py 2.5.0. Never released: they ship in 2.7.0, so install 2.7.0 to use them.

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
