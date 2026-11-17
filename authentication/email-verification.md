# E-Mail Verification

A verified e-mail lets the user:

- reset a [forgotten password](/authentication/password#forgot-password),
- [recover](/authentication/profile#recovering-a-disabled-account) a disabled account,
- make their e-mail [public](/authentication/profile#public-fields),
- log in with the e-mail, when the account was created with a `username`.

An e-mail confirmed through [signup confirmation](/authentication/signup#signup-confirmation) is already verified.

## Verifying the e-mail

[`verifyEmail(code:template:)`](/api-reference/authentication#verifyemail) works in two calls. The user must be signed in.

1. Without a code, it e-mails a verification code to the user.
2. With the code, it verifies the e-mail.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
try await skapi.login(email: "user@example.com", password: "password")

print(try await skapi.verifyEmail())               // SUCCESS: Verification code has been sent.
// the user types the code from the e-mail
print(try await skapi.verifyEmail(code: code))     // SUCCESS: "email" is verified.
print(await skapi.user?["email_verified"]?.bool ?? false)  // true
```

When the e-mail is already verified, `verifyEmail()` returns `SUCCESS: "email" is verified.` and sends nothing.

To use one of your project's uploaded templates for the code e-mail, pass its message ID: `verifyEmail(template: ["verification": "<message_id>"])`.

Changing the e-mail with [`updateProfile(_:)`](/authentication/profile) makes it unverified again.

## Going back to the last verified e-mail

When a user changed their e-mail and has not verified the new one, [`lastVerifiedEmail(revert:)`](/api-reference/authentication#lastverifiedemail) returns their previous verified address. `lastVerifiedEmail(revert: true)` switches the account back to that address, verified, and returns the updated profile.

```swift
print(try await skapi.lastVerifiedEmail().string ?? "")   // old@example.com
let user = try await skapi.lastVerifiedEmail(revert: true)
print(user["email"]?.string ?? "")                        // old@example.com
```

When the current e-mail is verified, it returns the current e-mail. When there is no earlier verified address, it throws `NOT_EXISTS`.
