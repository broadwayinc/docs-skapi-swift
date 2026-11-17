# Authentication

Every method throws [`SkapiError`](/introduction/errors) with `.code` and `.message`. Methods that need a signed-in user throw `INVALID_REQUEST` (`User login is required.`) without one, and any method can throw `NETWORK_ERROR` when no answer comes back.

Values that fail a check throw `INVALID_PARAMETER` before anything is sent. The common messages:

| field | message |
|---|---|
| `email` | `"email" is required.` / `"email" should be at least 5 characters.` / `"<value>" is an invalid email.` |
| `password` | `"password" is required.` / `"password" should be at least 6 characters.` / `"password" can be up to 60 characters max.` |
| `phone_number` | `"phone_number" is invalid. The format should be "+00123456789". Type: string.` |
| `birthdate` | `"birthdate" is invalid. The format should be "yyyy-mm-dd". Type: string.` |
| `picture`, `profile`, `website`, redirect URLs | `"<value>" is an invalid url.` (a full URL with scheme and host is required) |
| text fields | `<value> is invalid in "<field>". allowed type or value is: Type<string>.` |

## signup

```swift
func signup(_ params: JSON, option: JSON? = nil) async throws -> JSON
```

Creates an account. Logs out the user signed in on this object first.

`params`:

| key | type | |
|---|---|---|
| `email` | string | required |
| `password` | string | required, 6 to 60 characters |
| `username` | string | optional permanent login ID; the e-mail logs in too once verified |
| `name`, `nickname`, `given_name`, `middle_name`, `family_name`, `gender`, `misc` | string | |
| `birthdate` | string | `"yyyy-mm-dd"` |
| `phone_number` | string | `"+"` and digits |
| `address` | string or object | |
| `picture`, `profile`, `website` | string | full URL |
| `email_public`, `phone_number_public`, `address_public`, `gender_public`, `birthdate_public` | bool | default `false` |

`option`:

| key | type | |
|---|---|---|
| `signup_confirmation` | bool or string | `true` sends a confirmation link the user must open before logging in. A full URL also does, and the link leads there after confirming. Default `false`. |
| `login` | bool | log in right after signup and return the profile. Not with `signup_confirmation`. |
| `email_subscription` | bool, number or string | subscribes the user to a newsletter once they confirm. Needs `signup_confirmation`. |
| `template` | object | `["signup_confirmation": "<message_id>", "welcome": "<message_id>"]`: uploaded templates for this call |

Returns a `JSON` string, `"SUCCESS: The account has been created."` or `"SUCCESS: The account has been created. User's signup confirmation is required."` with `signup_confirmation`, or the [profile](/authentication/profile#profile-fields) object with `login`. See [Signing Up Users](/authentication/signup).

### Errors

| code | message |
|---|---|
| `EXISTS` | `The account already exists.` |
| `INVALID_PARAMETER` | `Key "email" is required.` / `Key "password" is required.` |
| `INVALID_PARAMETER` | `"address" should be type: <string \| dict>.` |
| `INVALID_PARAMETER` | `Invalid password. Password must be at least 6 characters.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" should be type: <string \| boolean>.` |
| `INVALID_PARAMETER` | `"login" is not allowed when "option.signup_confirmation" is true.` / `"option.login" should be type: boolean.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" should be true if "email_public" is set to true.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" is required for email subscription.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" is required when "option.template.signup_confirmation" is set.` |
| `INVALID_PARAMETER` | `"option.template" should be type: <object>.` / `"option.template.<key>" should be a non-empty <string> (template message_id).` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `CODE_DELIVERY_FAILURE` | `Failed to deliver verification code.` |
| `INVALID_REQUEST` | the server's reason |

## resendSignupConfirmation

```swift
func resendSignupConfirmation() async throws -> JSON
```

Sends the signup confirmation e-mail again. Works after `login` threw `SIGNUP_CONFIRMATION_NEEDED`, or after `signup` with `signup_confirmation`, on the same object. Returns the server's message.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Least one login attempt is required.` |

## login

```swift
func login(email: String? = nil, username: String? = nil, password: String) async throws -> JSON
```

Signs in and returns the [profile](/authentication/profile#profile-fields). The e-mail is matched without regard to case. An `email` that is not an e-mail address is read as a username. The password is never sent: sign-in proves it with a secure exchange. The session is saved to `storage`. See [Login / Logout](/authentication/login).

### Errors

| code | message |
|---|---|
| `INCORRECT_USERNAME_OR_PASSWORD` | `Incorrect username or password.` |
| `SIGNUP_CONFIRMATION_NEEDED` | `User's signup confirmation is required.` |
| `USER_IS_DISABLED` | `This account is disabled.` |
| `MFA_REQUIRED` | `A code from the authenticator app is required to sign in. Call verifyMFA() with the code.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `INVALID_PARAMETER` | `At least one of "username" or "email" is required.` |
| `INVALID_REQUEST` | `Sign-in codes by SMS are not supported.` / `The account must set up an authenticator app before signing in.` |

## verifyMFA

```swift
func verifyMFA(code: String) async throws -> JSON
```

Finishes a `login` or `openIdLogin` that threw `MFA_REQUIRED`, with the 6 digit code from the authenticator app (spaces are ignored). Call it on the same object within 3 minutes. Returns the profile. See [Two-Step Login](/authentication/mfa).

| code | message |
|---|---|
| `INVALID_CODE` | `Incorrect authenticator code.` / `This authenticator code was already used. Wait for the next code.` (retry with the next code) |
| `INVALID_REQUEST` | `No sign-in is waiting for an authenticator code. Call login() first.` |
| `INVALID_REQUEST` | `The sign-in has expired. Call login() again.` |
| `INVALID_PARAMETER` | `"code" should be the 6 digit code from the authenticator app.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## logout

```swift
func logout(global: Bool = false) async throws -> String
```

Signs out and removes the session from `storage`. `global: true` also ends every session of the account on every device. On an anonymous account it deletes the account. With encryption on, the key this device remembers is removed. Returns `"SUCCESS: The user has been logged out."`

## getProfile

```swift
func getProfile(refreshToken: Bool = false) async -> JSON?
```

The signed-in user's profile, or `nil`. `refreshToken: true` gets fresh tokens from the server first and returns `nil` if that fails. It does not throw.

## user

```swift
var user: JSON? { get async }
var session: SkapiSession? { get async }
```

`await skapi.user` is the signed-in user's profile (a copy), or `nil`. The first read restores a session saved in `storage`.

`await skapi.session` holds the tokens:

| property | |
|---|---|
| `idToken.jwtToken` | the ID token |
| `accessToken.jwtToken` | the access token |
| `refreshToken` | the refresh token |

Each `JwtToken` also has `payload` (the token's claims, a `JSONObject`), `expiration` and `issuedAt` (seconds).

## loginWithToken

```swift
func loginWithToken(idToken: String, accessToken: String, refreshToken: String) async throws -> JSON
```

Takes over the tokens of a sign-in made elsewhere and returns the profile read from the ID token. All three tokens are required; the object is then signed in as that user and the tokens are saved to `storage`. The token's signature is not checked locally; the server checks it on each request.

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"idToken" is required.` / `"accessToken" is required.` / `"refreshToken" is required.` |
| `INVALID_REQUEST` | `Token does not belong to this service.` / `Token has expired.` |

## updateProfile

```swift
func updateProfile(_ params: JSON) async throws -> JSON
```

Changes the signed-in user's own profile and returns the updated profile. Takes the same profile keys as [signup](#signup) except `password` and `username`. `""` clears a field (not `email`). The `*_public` flags must be bools. Other keys are ignored; with nothing to change, it returns the profile without a request. A changed `email` becomes unverified. See [User Profile](/authentication/profile).

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot edit their profile.` |
| `INVALID_REQUEST` | `User's e-mail should be verified to set "email_public" to true.` |
| `INVALID_PARAMETER` | `<value> is invalid in "<flag>". allowed type or value is: Type<boolean>.` |
| the server's code | the server's message, when it refuses the change |

## changePassword

```swift
func changePassword(currentPassword: String, newPassword: String) async throws -> String
```

Returns `"SUCCESS: Password has been changed."` With encryption on, the keyring gets a wrap under the new password first. See [Passwords](/authentication/password).

| code | message |
|---|---|
| `INVALID_REQUEST` | `Incorrect password.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot change their password.` |
| `INVALID_PARAMETER` | `"current_password" is required to change password.` / `"new_password" is required to change password.` |
| `INVALID_PARAMETER` | `"new_password" should be at least 6 characters.` / `"new_password" can be up to 60 characters max.` (the same for `current_password`) |
| `INVALID_PARAMETER` | `Invalid password parameter.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `ENCRYPTION_LOCKED` | encryption is on and locked; the password is not changed |

## forgotPassword

```swift
func forgotPassword(email: String, template: JSON? = nil) async throws -> String
```

E-mails a password reset code. `template: ["forgot_password": "<message_id>"]` uses an uploaded template for this call. Returns `"SUCCESS: Verification code has been sent."`

| code | message |
|---|---|
| `NOT_EXISTS` | the server's message |
| `INVALID_REQUEST` | the server's message, for example `User password cannot be reset in the current state.` |
| `REQUEST_EXCEED` | the server's message, for example `Attempt limit exceeded, please try after some time.` |
| `CODE_DELIVERY_FAILURE` | the server's message |
| `INVALID_PARAMETER` | `"template" should be type: <object>.` / `"template.forgot_password" should be a non-empty <string> (template message_id).` |

## resetPassword

```swift
func resetPassword(email: String, code: String, newPassword: String) async throws -> String
```

Sets a new password with the code from `forgotPassword`. Returns `"SUCCESS: New password has been set."` A wrong or expired code throws the server's code and message, for example `CodeMismatchException`.

## verifyEmail

```swift
func verifyEmail(code: String? = nil, template: JSON? = nil) async throws -> String
```

Without `code`, e-mails a verification code and returns `"SUCCESS: Verification code has been sent."` With `code`, verifies the e-mail and returns `SUCCESS: "email" is verified.`, which is also returned at once when the e-mail is already verified. `template: ["verification": "<message_id>"]` uses an uploaded template for the code e-mail. See [E-Mail Verification](/authentication/email-verification).

| code | message |
|---|---|
| `INVALID_REQUEST` | `The user has to be logged in.` / `No e-mail to verify` |
| `INVALID_REQUEST` | `Anonymous accounts cannot verify an e-mail.` |
| `INVALID_PARAMETER` | `"template.verification" should be a non-empty <string> (template message_id).` |
| `CodeMismatchException` | `Invalid verification code provided, please try again.` |
| `LimitExceededException` | `Attempt limit exceeded, please try after some time.` |

## lastVerifiedEmail

```swift
func lastVerifiedEmail(revert: Bool? = nil) async throws -> JSON
```

Returns the user's last verified e-mail as a `JSON` string (the current one, if it is verified). `revert: true` switches the account back to that e-mail, verified, and returns the updated profile.

| code | message |
|---|---|
| `NOT_EXISTS` | `User does not have a verified e-mail.` |
| `EXISTS` | `E-mail "<email>" is already a login ID in this project.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot change their e-mail.` |

## disableAccount

```swift
func disableAccount() async throws -> JSON
```

Disables the signed-in user's account and logs out. The account's data is deleted after 90 days unless it is recovered. Returns the server's message, `"SUCCESS: account has been disabled."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot be disabled.` |

## recoverAccount

```swift
func recoverAccount(redirect: JSON = false) async throws -> String
```

After `login` threw `USER_IS_DISABLED` on this object, e-mails a recovery link to the account. `redirect` is `false`, `true`, or a full URL string, where the link leads after the recovery: `recoverAccount(redirect: "https://your.site/welcome-back")`. Returns `"SUCCESS: Recovery e-mail has been sent."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Least one signin attempt of disabled account is required.` |
| `INVALID_REQUEST` | `Argument should be type: <boolean \| string>.` |

## openIdLogin

```swift
func openIdLogin(token: String, id: String, merge: JSON? = nil, template: JSON? = nil) async throws -> JSON
```

Signs in through the OpenID logger `id` with a token from the provider, creating the account on first use. `merge: true` merges into an existing account with the same login ID; an array of attribute names (or one name) also copies those OpenID attributes. `template: ["welcome": "<message_id>"]` uses an uploaded template for the welcome e-mail.

Returns `{"userProfile": profile, "openid": provider attributes}`. Can throw `MFA_REQUIRED`, `USER_IS_DISABLED` and `REQUEST_EXCEED` like [login](#login). See [OpenID Login](/authentication/openid).

| code | message |
|---|---|
| `ACCOUNT_EXISTS` | `The account already exists.` (retry with `merge`) |
| `INVALID_REQUEST` | `The account needs to be confirmed.` |
| `EXISTS` | `The login ID of this OpenID account is already used by another account.` |
| `INVALID_PARAMETER` | `"merge" should be type: <boolean \| string[]>.` / `"merge" array items should be type: <string>.` |
| `INVALID_PARAMETER` | `"template" should be type: <object>.` / `"template.welcome" should be a non-empty <string> (template message_id).` |

## anonymousLogin

```swift
func anonymousLogin() async throws -> JSON
```

Signs in with a temporary account (`anonymous: true`, access group `1`) and returns its profile. Returns the current account when this object already holds an anonymous session. Sends a keep-alive every 10 minutes while the object lives; the account is deleted 30 minutes after the last one, or at once on `logout`. See [Anonymous Login](/authentication/anonymous).

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous login is not enabled for this project.` |
| `INVALID_REQUEST` | `User limit exceeded.` |
| `INVALID_REQUEST` | `A user is already logged in. Log out first.` |

## verifyAnonymousSession

```swift
func verifyAnonymousSession() async throws -> JSON?
```

For a temporary account restored from `storage`: asks the server whether it still exists. Returns the profile, or `nil` (after signing out) when the account was deleted. Any other signed-in user is returned as is, without a request; signed out returns `nil`.

## setupMFA

```swift
func setupMFA(issuer: String? = nil, accountName: String? = nil) async throws -> JSON
```

Starts two-step login setup. Returns `{"secret": String, "uri": String}`: show `uri` (`otpauth://...`) as a QR code, or `secret` for typing in. `issuer` defaults to the project name, `accountName` to the user's e-mail. Follow with [enableMFA](#enablemfa).

## enableMFA

```swift
func enableMFA(code: String) async throws -> String
```

Checks a code from the app and turns two-step login on. Returns `"SUCCESS: MFA has been enabled."`

| code | message |
|---|---|
| `INVALID_CODE` | `Incorrect authenticator code.` (nothing changed) |
| `INVALID_REQUEST` | `Call setupMFA() first.` |
| `INVALID_PARAMETER` | `"code" should be the 6 digit code from the authenticator app.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## disableMFA

```swift
func disableMFA() async throws -> String
```

Turns two-step login off. Returns `"SUCCESS: MFA has been disabled."`

## getMFAStatus

```swift
func getMFAStatus() async throws -> JSON
```

Returns `{"enabled": Bool}`.

`setupMFA`, `enableMFA`, `disableMFA` and `getMFAStatus` need a signed-in user and throw `INVALID_REQUEST` with a message starting with `Anonymous accounts cannot` on an anonymous account.
