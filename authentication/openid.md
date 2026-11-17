# OpenID Login

Users can sign in with an account they already have at an OpenID provider, such as Google, instead of a password for your project.

## How it works

1. The project owner registers an **OpenID logger** in the project settings on skapi.com. It tells Skapi which URL returns the user's profile for a token, and which profile attribute is the user's unique username. Each logger has an ID, for example `google`.
2. Your app gets an access token from the provider, the way the provider documents it (for example with the provider's iOS sign-in library, or `ASWebAuthenticationSession`).
3. [`openIdLogin(token:id:merge:template:)`](/api-reference/authentication#openidlogin) sends the token and the logger ID. Skapi asks the provider for the profile, then signs the user in, creating the account on first use.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let res = try await skapi.openIdLogin(token: accessToken, id: "google")
print(res["userProfile"]?["user_id"]?.string ?? "")
print(res["openid"] ?? .null)  // the profile attributes the provider returned
```

It returns an object with `userProfile` (the user's [profile](/authentication/profile#profile-fields)) and `openid` (the attributes from the provider).

If the account has [two-step login](/authentication/mfa) on, `openIdLogin()` throws `MFA_REQUIRED` and [`verifyMFA(code:)`](/api-reference/authentication#verifymfa) finishes the login.

To send one of your project's uploaded templates as the welcome e-mail for a new account, pass `template: ["welcome": "<message_id>"]`.

## Merging with an existing account

If the user already signed up with a password using the same login ID, `openIdLogin()` throws `ACCOUNT_EXISTS`. The user can merge the OpenID login into that account with `merge`:

- `merge: true` merges the accounts and copies no attributes.
- `merge: ["name"]` merges and also copies the listed OpenID attributes into the profile.

```swift
do {
    let res = try await skapi.openIdLogin(token: accessToken, id: "google")
} catch let err as SkapiError where err.code == "ACCOUNT_EXISTS" {
    if await askUser("An account already exists. Merge?") {
        let res = try await skapi.openIdLogin(token: accessToken, id: "google", merge: true)
    }
}
```

::: danger
After a merge, the user can no longer log in with a password. This cannot be undone.
:::

An existing account that has not confirmed its signup yet cannot be merged: `openIdLogin()` throws `INVALID_REQUEST` (`The account needs to be confirmed.`).
