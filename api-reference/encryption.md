# Encryption

Needs `Skapi(projectId:encryption:)` with an [`EncryptionOptions`](#encryptionoptions). See [Encrypting Private Data](/database/encryption). Every method that throws, throws [`SkapiError`](/introduction/errors).

## EncryptionOptions

```swift
struct EncryptionOptions {
    init(iterations: Int = 600000, trustPolicy: TrustPolicy = .tofu, withheld: Withheld = .null, recovery: Recovery = .code,
         table: String = "__skapi__keyring", persistDevice: Bool = true, deviceKeyStorage: SkapiStorage? = nil)
}
```

```swift
let skapi = try Skapi(projectId: "<Project ID>", encryption: EncryptionOptions())
```

| field | default | |
|---|---|---|
| `iterations` | `600000` | PBKDF2 rounds for new password wraps; at least `100000` |
| `recovery` | `.code` | `.none`: no encryption recovery codes |
| `trustPolicy` | `.tofu` | `.strict`: only pinned keys are used for sharing |
| `withheld` | `.null` | `.sentinel`: undecryptable `data` is `{"__skapi_no_access__": true, "reason": ...}` |
| `table` | `"__skapi__keyring"` | the table that holds keyrings |
| `persistDevice` | `true` | remember this device: after a password unlock, keep the master key in the Keychain (this device only) so a session restored at launch is unlocked without the password. `logout` removes it. See [Remembering this device](/database/encryption#remembering-this-device). |
| `deviceKeyStorage` | `nil` | where the remembered key is kept. Left out: the Keychain, this device only, readable after the first unlock. |

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"encryption.iterations" must be at least 100000.` (thrown by `Skapi(projectId:encryption:)`) |

## getEncryptionStatus

```swift
func getEncryptionStatus() async -> JSON
```

Does not throw. Waits for an unlock from this device's remembered key that is still running.

```json
{"status": "disabled"}
{"status": "locked", "reason": "NO_SESSION_KEY" | "OPENID_UNSUPPORTED", "user_id"?: "...", "fingerprint"?: "..."}
{"status": "unlocked", "user_id": "...", "fingerprint": "..."}
```

`fingerprint` is the user's own public key fingerprint, for others to pin.

## unlockEncryption

```swift
func unlockEncryption(password: String) async throws -> JSON
```

Opens the keyring with the password. Returns `{"status": "unlocked"}`. With `persistDevice`, this device remembers the key from then on. It never sets encryption up: that happens at the first login with the password, so an account that has never logged in with its password gets `NOT_EXISTS`. See [Unlocking](/database/encryption#unlocking).

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `"password" is required.` |
| `NOT_EXISTS` | `Encryption has not been set up for this account yet. It is set up at the first login with the password: log in with the password to start using it.` |
| `ENCRYPTION_BAD_PASSWORD` | `Incorrect password: the encryption keyring could not be opened.` |
| `ENCRYPTION_KEYRING_CORRUPT` | `The encryption keyring does not belong to this user.` / `The keyring has no password wrap.` |
| `ENCRYPTION_LOCKED` | `Encryption could not be unlocked: <reason>` |

## lockEncryption

```swift
func lockEncryption(forgetDevice: Bool = false) async -> JSON
```

Does not throw. Forgets the keys in memory. `forgetDevice: true` also removes the key this device remembers, so the next launch asks for the password again. Returns `{"status": "locked"}`, or `{"status": "disabled"}`. An encryption recovery code not collected yet is kept: the next `getConnectionInfo()` still returns it, once.

## isWithheld

```swift
nonisolated func isWithheld(_ value: JSON?) -> Bool
```

`true` for the `.sentinel` placeholder of undecryptable data. It is `nonisolated`, so it needs no `await`:

```swift
if skapi.isWithheld(record["data"]) { /* this session cannot read it */ }
```

## Encryption recovery code

Shown once, in [getConnectionInfo](/api-reference/connection#getconnectioninfo) as `"encryption_recovery"`, after the first password login with encryption on. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).

## unlockEncryptionWithRecoveryCode

```swift
func unlockEncryptionWithRecoveryCode(_ code: String, password: String? = nil) async throws -> JSON
```

Unlocks encryption with the saved encryption recovery code, for a user signed in after a password reset. With `password`, the keyring opens with that password from now on. The code is replaced by a new one.

```json
{"status": "unlocked", "repaired": true, "encryptionRecoveryCode": "<new code>"}
```

`encryptionRecoveryCode` is `null` with `recovery: .none`.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `INVALID_REQUEST` | `User login is required. Reset the password and log in first, then use the encryption recovery code.` |
| `INVALID_PARAMETER` | `"code" is required.` |
| `NOT_EXISTS` | `This account has no encryption keyring, so there is nothing to recover.` |
| `ENCRYPTION_BAD_RECOVERY_CODE` | `That does not look like an encryption recovery code: expected 28 characters, got <n>.` / `... "<c>" is not a valid character.` / `That encryption recovery code has a typo in it: the check characters do not match.` / `That encryption recovery code did not open the keyring. ...` |

## regenerateEncryptionRecoveryCode

```swift
func regenerateEncryptionRecoveryCode() async throws -> JSON
```

A new encryption recovery code, `{"encryptionRecoveryCode": "..."}`; the old one stops working. Needs encryption unlocked.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `ENCRYPTION_LOCKED` | `Encryption must be unlocked to issue an encryption recovery code. ...` |
| `INVALID_REQUEST` | `Encryption recovery codes are turned off for this instance ("encryption.recovery" is "none").` |
| `ENCRYPTION_KEYRING_CORRUPT` | `The encryption keyring could not be read.` / `This keyring predates encryption recovery code rotation and cannot issue a new code. ...` |

## pinPeerKey

```swift
func pinPeerKey(userId: String, fingerprint: String) async throws
```

Trusts `fingerprint` as `userId`'s key for sharing, saved in the keyring. Returns nothing. Throws `ENCRYPTION_LOCKED` (`Encryption is locked.`) when not unlocked.

## Errors from other methods

With encryption on, these can come from [postRecord](/api-reference/database#postrecord), [postRecords](/api-reference/database#postrecords), [uploadFiles](/api-reference/database#uploadfiles), [getFile](/api-reference/database#getfile), [grantPrivateRecordAccess](/api-reference/database#grantprivaterecordaccess), [removePrivateRecordAccess](/api-reference/database#removeprivaterecordaccess) and [changePassword](/api-reference/authentication#changepassword):

| code | when |
|---|---|
| `ENCRYPTION_LOCKED` | writing a private record, changing the password, or opening an encrypted file while locked |
| `ENCRYPTION_BAD_PASSWORD` | `changePassword` with a wrong current password |
| `ENCRYPTION_NOT_RECORD_OWNER` | writing another user's encrypted record |
| `ENCRYPTION_CANNOT_REWRITE_WITHHELD` | writing back a withheld placeholder |
| `ENCRYPTED_DATA_TOO_LARGE` | the encrypted data is over 2 MB |
| `ENCRYPTION_GRANT_REQUIRES_OWNER` | sharing or removing access on a record you do not own |
| `ENCRYPTION_RECIPIENT_HAS_NO_KEY` | the user never signed in with encryption on |
| `ENCRYPTION_PEER_KEY_CHANGED` / `ENCRYPTION_PEER_NOT_PINNED` | see [Sharing](/database/encryption#sharing-a-record) |
| `ENCRYPTION_DATA_UNAVAILABLE` | the record's data could not be read while changing its sharing |
| `ENCRYPTION_FILE_CORRUPT` / `ENCRYPTION_FILE_STALE_KEY` | an encrypted file does not open with the record's key |
| `INVALID_PARAMETER` | `"__skapi_enc__" is a reserved key in record data.` / `"__skenc__" is reserved in an upload form key.` |
