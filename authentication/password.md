# Passwords

Passwords are 6 to 60 characters.

## Changing the password

A signed-in user changes their password with [`changePassword(currentPassword:newPassword:)`](/api-reference/authentication#changepassword), giving the current one and the new one.

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")
try await skapi.login(email: "user@example.com", password: "password")

do {
    print(try await skapi.changePassword(currentPassword: "password", newPassword: "new password"))
    // SUCCESS: Password has been changed.
} catch let err as SkapiError where err.code == "INVALID_REQUEST" {
    print(err.message)  // Incorrect password.
}
```

## Forgot password

A user who cannot log in resets the password in two steps. The reset code is always sent by e-mail, so a user whose e-mail is not [verified](/authentication/email-verification) may not receive it. Encourage users to verify their e-mail.

### Step 1: send the code

[`forgotPassword(email:template:)`](/api-reference/authentication#forgotpassword) e-mails a reset code to the account.

```swift
print(try await skapi.forgotPassword(email: "user@example.com"))  // SUCCESS: Verification code has been sent.
```

To use one of your project's uploaded templates for this e-mail, pass its message ID: `forgotPassword(email: "user@example.com", template: ["forgot_password": "<message_id>"])`.

### Step 2: set the new password

[`resetPassword(email:code:newPassword:)`](/api-reference/authentication#resetpassword) takes the e-mail, the code from the e-mail, and the new password.

```swift
print(try await skapi.resetPassword(email: "user@example.com", code: "123456", newPassword: "new password"))
// SUCCESS: New password has been set.
```

Resetting the password does not turn off [two-step login](/authentication/mfa#lost-phone). It does sign the account out on every other device: each one is signed out the next time it refreshes its login (within a day at most).
