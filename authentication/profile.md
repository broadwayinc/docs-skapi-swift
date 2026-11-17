# User Profile

The signed-in user's profile is a [`JSON`](/introduction/getting-started#json-values) object, available as `await skapi.user` and from [`getProfile()`](/authentication/login#the-signed-in-user).

## Updating the profile

[`updateProfile(_:)`](/api-reference/authentication#updateprofile) changes the signed-in user's own profile and returns the updated profile.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
try await skapi.login(email: "user@example.com", password: "password")

let user = try await skapi.updateProfile(["name": "Ana", "nickname": "ana"])
print(user["name"]?.string ?? "")  // Ana
```

Pass only the fields you want to change. An empty string `""` clears a field:

```swift
try await skapi.updateProfile(["nickname": ""])
```

`email` cannot be cleared. A changed e-mail becomes unverified until the user [verifies](/authentication/email-verification) it.

Keys that are not profile fields are ignored. Anonymous accounts cannot edit their profile.

## Profile fields

Fields the user can set, at [signup](/authentication/signup) or with `updateProfile(_:)`:

| field | value |
|---|---|
| `email` | the user's e-mail |
| `name`, `nickname`, `given_name`, `middle_name`, `family_name` | text |
| `gender` | text, for example `"female"` or `"male"` |
| `birthdate` | `"yyyy-mm-dd"` |
| `phone_number` | `"+"` and digits, for example `"+821012345678"` |
| `address` | text, or an object such as `["formatted": ..., "locality": ..., "region": ..., "postal_code": ..., "country": ...]` |
| `picture`, `profile`, `website` | a full URL |
| `misc` | any text for your own use; only the user and admins can read it |

Fields set by Skapi, which the user cannot change:

| field | value |
|---|---|
| `user_id` | the user's ID |
| `service`, `owner` | the project and its owner |
| `access_group` | the account's access level, a number |
| `approved` | `"{approver}:{approved or suspended}:{timestamp}"` |
| `locale` | country code where the user signed up |
| `log` | last login time, in seconds |
| `email_verified` | `true` when the e-mail is verified |
| `anonymous` | `true` on [anonymous accounts](/authentication/anonymous), absent otherwise |

## Public fields

`email`, `phone_number`, `address`, `gender` and `birthdate` are private by default. Set the matching `*_public` flag to `true` to let other users see that field when they [search users](/users/search).

```swift
try await skapi.updateProfile(["gender": "female", "gender_public": true])
```

The flags are `email_public`, `phone_number_public`, `address_public`, `gender_public` and `birthdate_public`, and must be `true` or `false`. A flag appears in the profile only when its field is set. `email_public: true` needs a verified e-mail, or it throws `INVALID_REQUEST`.

## Disabling an account

A user who leaves your project can disable their own account with [`disableAccount()`](/api-reference/authentication#disableaccount). They are logged out at once, and all data of the account is deleted after 90 days.

```swift
print(try await skapi.disableAccount().string ?? "")  // SUCCESS: account has been disabled.
```

## Recovering a disabled account

Within those 90 days, logging in to a disabled account throws `USER_IS_DISABLED`. Call [`recoverAccount(redirect:)`](/api-reference/authentication#recoveraccount) on the same `Skapi` object to send the user an e-mail with a recovery link. Opening the link reactivates the account.

```swift
do {
    try await skapi.login(email: "user@example.com", password: "password")
} catch let err as SkapiError where err.code == "USER_IS_DISABLED" {
    print(try await skapi.recoverAccount())  // SUCCESS: Recovery e-mail has been sent.
}
```

Pass a full URL, `recoverAccount(redirect: "https://your.site/welcome-back")`, to have the link lead there after the recovery. The account can only be recovered when its e-mail is verified and the user knows their password.
