# Inquiries

[`sendInquiry(_:)`](/api-reference/users#sendinquiry) sends a message to the project owner's e-mail. Anyone can send one, signed in or not, which makes it a simple "Contact us" screen:

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

do {
    let res = try await skapi.sendInquiry([
        "name": "John Doe",
        "email": "john@doe.com",
        "subject": "Inquiry",
        "message": "Hello, I have a question.",
    ])
    print(res)  // SUCCESS: Inquiry has been sent.
} catch let err as SkapiError {
    print(err.code, err.message)
}
```

All four keys are required. `email` has to be a valid address.

The project owner can turn inquiries off in the project settings on [skapi.com](https://www.skapi.com). The call then fails with `ERROR` `Project does not allow inquiry.`
