# Version History

### Current version: 2.4.4

```swift
.package(url: "https://github.com/broadwayinc/skapi-swift.git", from: "2.4.4")
```

**2.4.4**

skapi-swift 2.4.4 matches skapi-js 2.4.4 and skapi-py 2.4.4. There was no skapi-swift 2.4.1 to 2.4.3 release.

- **A stalled file upload fails with `TIMEOUT` (`Upload timeout: ...`) instead of `NETWORK_ERROR`.** The limit was already how long a request goes with nothing moving, not its total time, so a slow upload that keeps moving is never cut off.
- **A request that stops moving fails with `TIMEOUT`.** When nothing is sent or received for `timeout` seconds, a call now throws `TIMEOUT` (`No response for 120 seconds.` with the default) instead of `NETWORK_ERROR`, so you can tell a dead connection from no connection. See [Errors](/introduction/errors).
- **Polling intervals under 1 second are refused.** The `poll` option of [`forwardRequest`](/api-reference/api-bridge#forwardrequest), the `poll` of [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) and the `poll` option of [`forwardRequestStream`](/api-reference/api-bridge#forwardrequeststream) now throw `INVALID_PARAMETER` (`"poll" should be a number of milliseconds, 1000 or more.`) for a value under `1000`; before, any number of 0 or more was accepted. `poll: 0` on [`forwardRequest`](/api-reference/api-bridge#forwardrequest) still means "do not poll", and `0` on [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) still means the default, 1000. The same rule as skapi-js 2.4.4.
- `skapiVersion` reads `"2.4.4"`.

skapi-js 2.4.3 (signed-out reads no longer sign out) and the 2.4.4 request queue change need nothing here: skapi-swift never signed out on a read, and it sends each request on its own instead of through a page-wide queue.

**2.4.0**

- First release of skapi-swift, the Swift version of skapi-js 2.4.0 and skapi-py 2.4.0.
