# Login / Logout

## Login

[`login(email:username:password:)`](/api-reference/authentication#login) signs a user in with their e-mail and password and returns their [profile](/authentication/profile#profile-fields).

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let user = try await skapi.login(email: "user@example.com", password: "password")
print(user["email"]?.string ?? "")
```

The password is never sent. Sign-in proves it with a secure exchange, so only the proof travels over the network.

The e-mail is matched without regard to letter case. An account created with a `username` logs in with it: `login(username: "ana", password: "password")`. An `email` that is not an e-mail address is also read as a username, so one text field can take either.

### Handling login errors

```swift
func logIn(email: String, password: String) async throws -> JSON? {
    do {
        return try await skapi.login(email: email, password: password)
    } catch let err as SkapiError {
        switch err.code {
        case "INCORRECT_USERNAME_OR_PASSWORD":
            print("Wrong e-mail or password.")
        case "SIGNUP_CONFIRMATION_NEEDED":
            try await skapi.resendSignupConfirmation()   // see Signing Up Users
        case "USER_IS_DISABLED":
            try await skapi.recoverAccount()             // see User Profile
        case "MFA_REQUIRED":
            showCodeField()   // then call skapi.verifyMFA(code:), see Two-Step Login
        default:
            throw err
        }
        return nil
    }
}
```

- `SIGNUP_CONFIRMATION_NEEDED`: the user has not opened the [confirmation link](/authentication/signup#signup-confirmation) yet.
- `USER_IS_DISABLED`: the user disabled their account. See [recovering it](/authentication/profile#recovering-a-disabled-account).
- `MFA_REQUIRED`: the password was right and the account has [two-step login](/authentication/mfa) on.
- `REQUEST_EXCEED`: too many attempts. Wait and try again.

## The signed-in user

`await skapi.user` is the signed-in user's profile, or `nil` when nobody is signed in. It is a copy: changing it changes nothing on the server.

```swift
if await skapi.user == nil {
    try await skapi.login(email: "user@example.com", password: "password")
}
print(await skapi.user?["user_id"]?.string ?? "")
```

[`getProfile(refreshToken:)`](/api-reference/authentication#getprofile) returns the same thing. `getProfile(refreshToken: true)` asks the server for fresh tokens first, so the profile shows changes made elsewhere, for example on another device or by an admin. It returns `nil` if the refresh fails. When the saved tokens had already expired and were just refreshed while the session was restored, that refresh is used: the server is asked once, not twice.

skapi-swift refreshes the tokens on its own before a request when they have less than an hour left. One refresh runs at a time: other calls on the same object (realtime and the anonymous keep-alive too) wait for it and use the new tokens. If the network is down, the session stays and the request throws `NETWORK_ERROR`. The session ends only on logout, or when the server refuses the refresh (for example after a global logout).

## Staying signed in between launches

On iOS and macOS the session is kept in the Keychain, so the user stays signed in when the app is launched again:

```swift
let skapi = try Skapi(projectId: "<Project ID>")

if await skapi.user == nil {          // signed in from the Keychain when it holds a session
    try await skapi.login(email: "user@example.com", password: "password")
}
```

If the saved tokens have expired and the network is down when they are read, the object stays signed in with them: signed-in calls throw `NETWORK_ERROR`, and the first one after the network is back refreshes the tokens. To keep the session somewhere else, or not at all, pass a `storage`: see [Keeping users signed in](/introduction/getting-started#keeping-users-signed-in). Logging out removes the tokens from storage.

## Logout

```swift
print(try await skapi.logout())  // SUCCESS: The user has been logged out.
```

`logout(global: true)` also ends every session of the account on every device.

A logout wins over a token refresh still running in another task: the refresh does not sign the user back in, its tokens are removed from storage, and the call that waited for it throws `User login is required.`

On an [anonymous](/authentication/anonymous) session, `logout()` deletes the temporary account.

## Signing in with tokens

[`loginWithToken(idToken:accessToken:refreshToken:)`](/api-reference/authentication#loginwithtoken) takes over a session that started somewhere else, for example a sign-in your own server made, or a web view running skapi-js that hands the user's tokens to your app.

```swift
let user = try await skapi.loginWithToken(idToken: idToken, accessToken: accessToken, refreshToken: refreshToken)
```

All three tokens are required. The ID token must belong to this project and must not be expired. The object is then signed in as that user, and the tokens are saved to `storage`. `await skapi.session` holds the current tokens (`.idToken.jwtToken`, `.accessToken.jwtToken`, `.refreshToken`) if you need to pass them on.

::: warning
skapi-swift reads the profile from the ID token without checking its signature. The server checks the tokens on every request. Before trusting `skapi.user` in your own code, make a signed-in call, for example `getProfile(refreshToken: true)`, which returns `nil` for tokens the server refuses.
:::
