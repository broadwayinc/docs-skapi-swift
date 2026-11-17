# Two-Step Login (MFA)

Users can protect their account with an authenticator app. Once it is on, logging in takes the password and then a 6 digit code from the app. Someone who learns the password still cannot log in without the phone.

Each user turns it on for their own account. Any app that shows 6 digit codes changing every 30 seconds works. Codes are never sent by SMS.

`setupMFA()`, `enableMFA(code:)`, `getMFAStatus()` and `disableMFA()` need a signed-in user (`INVALID_REQUEST`: `User login is required.`) and refuse [anonymous accounts](/authentication/anonymous).

## Turning it on

### Step 1: show the key

[`setupMFA(issuer:accountName:)`](/api-reference/authentication#setupmfa) returns an object with:

- `uri`: an `otpauth://` link. Show it as a QR code for the user to scan (Core Image's `CIFilter.qrCodeGenerator()` draws one), or open it with `UIApplication.shared.open` so an authenticator app on the same phone adds the account.
- `secret`: the same key as text, for users who type it into the app.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
try await skapi.login(email: "user@example.com", password: "password")

let mfa = try await skapi.setupMFA()
print(mfa["secret"]?.string ?? "")  // type this into the authenticator app
let uri = mfa["uri"]?.string ?? ""  // or show this as a QR code
```

The app lists the account under your project name and the user's e-mail. Pass `issuer` and `accountName` to show other names: `skapi.setupMFA(issuer: "My App", accountName: "ana")`.

### Step 2: confirm a code

The user enters the code the app now shows. [`enableMFA(code:)`](/api-reference/authentication#enablemfa) checks it and turns two-step login on.

```swift
print(try await skapi.enableMFA(code: "123456"))  // SUCCESS: MFA has been enabled.
```

A wrong code throws `INVALID_CODE` and changes nothing, so the user can try the next code. Calling `enableMFA(code:)` before `setupMFA()` throws `INVALID_REQUEST` (`Call setupMFA() first.`).

## Logging in with a code

When two-step login is on, [`login()`](/api-reference/authentication#login) checks the password and throws `MFA_REQUIRED`. The user is not signed in yet. Pass the code to [`verifyMFA(code:)`](/api-reference/authentication#verifymfa), which finishes the login and returns the profile like `login()` does.

```swift
// first screen: e-mail and password
do {
    try await skapi.login(email: email, password: password)
} catch let err as SkapiError where err.code == "MFA_REQUIRED" {
    showCodeField()
}

// second screen: the code from the authenticator app
let user = try await skapi.verifyMFA(code: codeField.text ?? "")
```

- **3 minutes.** Call `verifyMFA(code:)` within 3 minutes of `login()`. After that it throws `INVALID_REQUEST` (`The sign-in has expired. Call login() again.`).
- **Same object.** The waiting login is kept in memory on this `Skapi` object only, never in `storage`. A new object or a new launch must call `login()` again.
- **Wrong code.** `INVALID_CODE` (`Incorrect authenticator code.`) can be retried with the next code. A code that was already used throws `INVALID_CODE` too: wait for the app to show a new one.
- [`openIdLogin()`](/authentication/openid) works the same way. `verifyMFA(code:)` then returns the profile alone, without the `openid` values.

## Checking and turning it off

```swift
print(try await skapi.getMFAStatus())  // {"enabled":true}
print(try await skapi.disableMFA())    // SUCCESS: MFA has been disabled.
```

After [`disableMFA()`](/api-reference/authentication#disablemfa), the next login takes the password alone.

## Lost phone

[Resetting the password](/authentication/password#forgot-password) does not turn two-step login off, so a user who lost their phone cannot log in on their own. An admin of your project can turn it off for them. The user then logs in with their password and can set it up again.
