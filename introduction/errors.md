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
| `TOO_MANY_REQUESTS` | The server kept answering "too many requests" after 6 automatic retries. |
| `NETWORK_ERROR` | No answer came back. The user stays signed in; try again when the network is back. |
| `TIMEOUT` | Nothing was sent or received for `timeout` seconds (`No response for 120 seconds.` with the default), or a file upload stalled (`Upload timeout: ...`). Try again. |
| `EXCEED_LIMIT` | The project is at a limit of its plan. On Trial and Standard, once the month's API requests are used up, every call is refused until the month ends with `This project has used its 500,000 API requests for this month. Requests are refused until the month ends. Consider upgrading your plan.` (the number is the plan's own limit). See [Plans and Limits](https://docs.skapi.com/introduction/plans.html#api-requests). |
| `ERROR` | Anything else. The message says what happened. |

[Encryption](/database/encryption) adds its own codes, such as `ENCRYPTION_LOCKED`; they are listed in the [Encryption reference](/api-reference/encryption).

## Retries

skapi-swift retries on its own when the server asks it to slow down (it waits as long as the server says, up to 6 times), and when a token refresh fails (for about 6 seconds). Other errors are thrown at once. A token refresh that still fails for lack of network keeps the session: the call throws `NETWORK_ERROR`, and the next call after the network is back refreshes again.

## Cancelling

skapi-swift calls are ordinary `async` calls. Waiting calls that sleep between checks, such as [`forwardRequestPoll`](/api-bridge/forward-request#reading-an-answer-later), stop with Swift's `CancellationError` when the task that runs them is cancelled, for example when a SwiftUI view's `.task` ends.
