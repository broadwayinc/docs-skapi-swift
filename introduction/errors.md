# Errors

Every error skapi-swift throws is a `SkapiError` with three fields:

- `code`: a short name you can check in code, such as `INVALID_PARAMETER`.
- `message`: what went wrong, in plain words.
- `cause`: the underlying error or the server's error body, when there is one.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

do {
    try await skapi.login(email: "user@example.com", password: "wrong password")
} catch let err as SkapiError {
    print(err.code)     // INCORRECT_USERNAME_OR_PASSWORD
    print(err.message)  // Incorrect username or password.
}
```

`SkapiError` is a `LocalizedError`, so `err.localizedDescription` reads `"<code>: <message>"`, ready for an alert while you build.

The codes are the same ones skapi-js and skapi-py use, so a check written for one works for the others.

## Common codes

| code | meaning |
|---|---|
| `INVALID_PARAMETER` | A value you passed is missing, the wrong type, or out of range. The message names it. Nothing was sent. |
| `INVALID_REQUEST` | The call is not allowed in this state, for example `User login is required.` |
| `NOT_EXISTS` | The record, file, account or project does not exist. |
| `EXISTS` | It already exists, for example an account with that e-mail. |
| `INCORRECT_USERNAME_OR_PASSWORD` | Wrong e-mail, username or password. |
| `MFA_REQUIRED` | The password was right and the account has two-step login on: call `verifyMFA(code:)` with the code. See [Two-Step Login](/authentication/mfa). |
| `INVALID_CODE` | Wrong authenticator code. Try the next one. |
| `SIGNUP_CONFIRMATION_NEEDED` | The user has not confirmed their signup yet. |
| `USER_IS_DISABLED` | The account is disabled. See [User Profile](/authentication/profile). |
| `REQUIRE_LOGIN` | The project only lets signed-in users read its database. |
| `REQUEST_EXCEED` | Too many attempts. Wait and try again. |
| `TOO_MANY_REQUESTS` | The server kept answering "too many requests" after 6 automatic retries, or a file upload was refused as too many requests (`Too many requests`). |
| `RATE_LIMITED` | The server answered "too many requests" without saying how long to wait (`Too many requests`). Try again later. |
| `SERVER_ERROR` | The server failed (a status of 500 or above, except 501). Not a refusal: try again. The server's own answer is in `cause`. File uploads keep the storage service's own code instead. |
| `NETWORK_ERROR` | No answer came back. The user stays signed in; try again when the network is back. |
| `TIMEOUT` | Nothing was sent or received for `timeout` seconds (`No response for 120 seconds.` with the default), a file upload stalled (`Upload timeout: ...`), a call ran past its `deadline` (`No answer within <n> ms.`), or a sign-in token refresh did not answer within 15 seconds (`The sign-in token refresh did not answer within 15 seconds.`; the user stays signed in and the next call tries again). Try again. |
| `ABORTED` | The `Task` that awaited the call was cancelled, and the request was taken off the network (`Aborted`). |
| `EXCEED_LIMIT` | The project is at a limit of its plan. On Trial and Standard, once the month's API requests are used up, every call is refused until the month ends with `This project has used its 500,000 API requests for this month. Requests are refused until the month ends. Consider upgrading your plan.` (the number is the plan's own limit). See [Plans and Limits](https://docs.skapi.com/introduction/plans.html#api-requests). |
| `ERROR` | Anything else. The message says what happened. |

[Encryption](/database/encryption) adds its own codes, such as `ENCRYPTION_LOCKED`; they are listed in the [Encryption reference](/api-reference/encryption).

## Retries

skapi-swift retries on its own when the server asks it to slow down (it waits as long as the server says, up to 6 times), and when a token refresh fails (for about 6 seconds). Other errors are thrown at once. A token refresh that still fails for lack of network keeps the session: the call throws `NETWORK_ERROR`, and the next call after the network is back refreshes again. A call waits at most 15 seconds for a token refresh: past that it throws `TIMEOUT`, the session is kept, and the next call starts a new refresh. The refresh that picks up a change you just made ([updateProfile](/api-reference/authentication#updateprofile), [verifyEmail](/api-reference/authentication#verifyemail) with a code, [lastVerifiedEmail](/api-reference/authentication#lastverifiedemail), and [getProfile(refreshToken: true)](/api-reference/authentication#getprofile)) has no such limit, as in skapi-js: the change is already made, so the call waits for its new tokens.

`NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR` and `ABORTED` mean the call failed on the way; every other code is the server's answer. Trying again can work, but a call that failed on the way may still have run on the server: only one with `SkapiError.isTokenFailure` set is sure not to have been sent (it failed because no sign-in token could be had). Before sending again a call that must not run twice, check whether it ran; for a forwarded request, look it up by its `cref` (see [Finding a request again](/api-bridge/forward-request#finding-a-request-again)).

Waiting calls that poll for an answer ([forwardRequestPoll](/api-bridge/forward-request#reading-an-answer-later), [forwardRequestStream](/api-reference/api-bridge#forwardrequeststream), and `forwardRequest` with `poll` or `stream`) never end on these while they check for the answer: they try again, waiting twice as long each time up to 30 seconds, and refresh the token once after a `401`.

## Cancelling

skapi-swift calls are ordinary `async` calls. Cancelling the task that awaits one takes its request off the network, and the call throws `ABORTED` (the counterpart of skapi-js's `signal` option). This holds also while the call waits for a sign-in token refresh or for the time a `429` asked it to wait: it throws `ABORTED` at once. Waiting calls that sleep between checks, such as [`forwardRequestPoll`](/api-bridge/forward-request#reading-an-answer-later), stop with Swift's `CancellationError` instead, for example when a SwiftUI view's `.task` ends.
