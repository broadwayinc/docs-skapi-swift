# Signing Up Users

[`signup(_:option:)`](/api-reference/authentication#signup) creates an account in your project. `email` and `password` are required. The password must be 6 to 60 characters.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let res = try await skapi.signup([
    "email": "user@example.com",
    "password": "password",
    "name": "Ana",
])
print(res.string ?? "")  // SUCCESS: The account has been created.
```

You can pass any [profile field](/authentication/profile#profile-fields) in the same object. `signup()` first logs out the user signed in on this `Skapi` object, if any.

A user who never logs in within 7 days of signing up loses the signup and has to sign up again.

## Username

`username` is optional. When given, it becomes the account's permanent login ID and can never be changed. The e-mail logs the account in as well, but only once it is [verified](/authentication/email-verification). Without `username`, the e-mail is the login ID.

```swift
try await skapi.signup(["email": "user@example.com", "password": "password", "username": "ana"])
try await skapi.login(username: "ana", password: "password")
```

## Log in right after signup

Pass `["login": true]` as the `option`. `signup()` then returns the user's profile instead of a message.

```swift
let user = try await skapi.signup(
    ["email": "user@example.com", "password": "password"],
    option: ["login": true]
)
print(user["user_id"]?.string ?? "")
```

`login` cannot be used together with `signup_confirmation`.

## Signup confirmation

With `signup_confirmation`, the user gets an e-mail with a confirmation link and cannot log in until they open it. This keeps fake accounts out. Once confirmed, the user's e-mail counts as verified.

```swift
let res = try await skapi.signup(
    ["email": "user@example.com", "password": "password"],
    option: ["signup_confirmation": true]
)
print(res.string ?? "")  // SUCCESS: The account has been created. User's signup confirmation is required.
```

Instead of `true` you can pass a full URL such as `"https://your.site/welcome"`. The confirmation link leads there once the signup is confirmed. A relative path throws `INVALID_PARAMETER`.

`email_public: true` at signup needs `signup_confirmation`. The `email_subscription` option subscribes the user to a newsletter once they confirm, and also needs `signup_confirmation`.

To use one of your project's uploaded e-mail templates for this call only, pass its message ID: `option: ["signup_confirmation": true, "template": ["signup_confirmation": "<message_id>", "welcome": "<message_id>"]]`.

## Resending the confirmation e-mail

A user who has not confirmed yet gets `SIGNUP_CONFIRMATION_NEEDED` from [`login()`](/authentication/login). Call [`resendSignupConfirmation()`](/api-reference/authentication#resendsignupconfirmation) on the same `Skapi` object to send the link again.

```swift
do {
    try await skapi.login(email: "user@example.com", password: "password")
} catch let err as SkapiError where err.code == "SIGNUP_CONFIRMATION_NEEDED" {
    let res = try await skapi.resendSignupConfirmation()
    print(res.string ?? "")  // the server's message
}
```

It also works right after a `signup()` with `signup_confirmation` on the same object. Without either, it throws `INVALID_REQUEST` (`Least one login attempt is required.`).

## Errors

| code | when |
|---|---|
| `EXISTS` | `The account already exists.` |
| `INVALID_PARAMETER` | a missing or invalid field or option; the message names it |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `CODE_DELIVERY_FAILURE` | `Failed to deliver verification code.` |

See [signup](/api-reference/authentication#signup) in the API reference for every option and error.
