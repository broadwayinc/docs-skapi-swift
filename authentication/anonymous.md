# Anonymous Login

[`anonymousLogin()`](/api-reference/authentication#anonymouslogin) signs in with a **temporary account**: no e-mail, no password, created by the one call. Use it when a user needs an account for a short task, such as writing records, without signing up.

The project owner must turn on **Anonymous Login** in the project settings. While it is off, the call throws `INVALID_REQUEST` (`Anonymous login is not enabled for this project.`).

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let user = try await skapi.anonymousLogin()
print(user["anonymous"]?.bool ?? false)    // true
print(user["access_group"]?.int ?? 0)      // 1
```

From then on the object is signed in like any other user, with the limits below.

- If this object already holds an anonymous session, `anonymousLogin()` returns that account instead of making a new one.
- If another user is signed in, it throws `INVALID_REQUEST` (`A user is already logged in. Log out first.`).
- An anonymous account counts as a user of your project while it exists. At the plan's user limit, it throws `INVALID_REQUEST` (`User limit exceeded.`).

## How long the account lives

While the `Skapi` object lives, it sends a keep-alive every 10 minutes from a background task. The account is deleted 30 minutes after the last keep-alive, so it goes away about half an hour after your app stops sending them (for example while it is suspended in the background, or after it quits). Everything it owns, such as its records and files, is deleted with it.

A session restored from the Keychain when the app launches again is checked at once and kept alive from then on, as long as the account still exists. When the app returns to the foreground, the account is checked again (see [App lifecycle](/introduction/getting-started#app-lifecycle)).

If a check finds the account already deleted, the object is signed out and `await skapi.user` becomes `nil`.

`logout()` deletes the account at once. So does `signup()`, which logs out first. `login()` and `openIdLogin()` replace the session; the anonymous account they leave behind is deleted 30 minutes later.

## What an anonymous account cannot do

A temporary account stays temporary. These methods throw `INVALID_REQUEST` with a message starting with `Anonymous accounts cannot`:

- [`updateProfile(_:)`](/authentication/profile)
- [`changePassword(currentPassword:newPassword:)`](/authentication/password)
- [`verifyEmail()`](/authentication/email-verification) and [`lastVerifiedEmail()`](/authentication/email-verification#going-back-to-the-last-verified-e-mail)
- [`disableAccount()`](/authentication/profile#disabling-an-account)
- [`setupMFA()`, `enableMFA(code:)`, `disableMFA()` and `getMFAStatus()`](/authentication/mfa)
- [`subscribeNewsletter(_:)`, `unsubscribeNewsletter(group:)` and `getNewsletterSubscription()`](/users/newsletters)

It has no e-mail or password, so it cannot reset a password or be recovered either.

To tell anonymous users apart, check `await skapi.user?["anonymous"]?.bool`: it is `true` on an anonymous account and `nil` on any other.

## Checking a restored session

A temporary account restored from the Keychain may have been deleted while the app was not running (30 minutes after the last keep-alive). [`verifyAnonymousSession()`](/api-reference/authentication#verifyanonymoussession) asks the server:

```swift
let skapi = try Skapi(projectId: "<Project ID>")

if try await skapi.verifyAnonymousSession() == nil {
    try await skapi.anonymousLogin()  // the old account is gone, or nobody was signed in: start a new one
}
```

It returns the profile, or `nil` after signing out when the account no longer exists. For a regular account it returns the profile without a request, and `nil` when nobody is signed in.
