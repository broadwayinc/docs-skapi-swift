# Not Included

skapi-swift has every feature of skapi-py, plus the ones an app on a phone or a Mac needs and a Python program does not: sessions kept in the Keychain, a remembered encryption key for this device, and reconnecting when the app returns to the foreground. A few skapi-js features are left out, because the platform has no equivalent or because they need something today's backend does not offer.

| skapi-js has | why skapi-swift leaves it out |
|---|---|
| Admin and project-owner methods (managing users, invitations, newsletters, hosting, project settings) | They belong to the dashboard on [skapi.com](https://www.skapi.com) and to the project owner, not to the users of your app. skapi-py leaves them out for the same reason. |
| Web push notifications: `subscribeNotification()`, `unsubscribeNotification()`, `vapidPublicKey()`, `pushNotification()` | They use the browser's Push API with VAPID keys and a service worker. iOS and macOS deliver notifications through Apple's push service (APNs), which today's backend does not send to. |
| WebRTC video and voice calls: `connectRTC()`, `closeRTC()` | They need a large native WebRTC library. [Realtime messages](/realtime/connecting) are included. |
| HTML form helpers: passing a form element or a submit event to a method, and the form `response` and `redirect` options | There is no web page and no DOM in an app. Pass your values as [`JSON`](/introduction/getting-started#json-values) instead. |
| The browser Project ID prompt | An app is built with its Project ID: pass it to `Skapi(projectId:)`. |
| Upload and download progress callbacks | Not in this release. Uploads and downloads return when they are done. |
| `forwardRequest` with `responseType: "response"` | The request is relayed and its answer stored by Skapi's server, so there is no live `Response` to hand over. The destination's status code is in [`forwardRequestHistory`](/api-bridge/forward-request#request-history). skapi-py leaves it out for the same reason. |

## What skapi-swift adds over skapi-py

These skapi-js features are web-only in skapi-js and left out of skapi-py. skapi-swift has a native counterpart for each:

| skapi-js | skapi-swift |
|---|---|
| sessions in `localStorage` | sessions in the [Keychain](/introduction/getting-started#keeping-users-signed-in), one Keychain service per project |
| the encryption key remembered in IndexedDB | the encryption key remembered in the Keychain, on this device only: [Remembering this device](/database/encryption#remembering-this-device) |
| reconnecting when a tab becomes visible or the browser goes back online | reconnecting when the app returns to the foreground or the network comes back: [App lifecycle](/introduction/getting-started#app-lifecycle) |
| uploading `File` objects from a page | uploading from a file URL, a path, `Data` or an `InputStream`: [Files](/database/files#uploading-with-a-record) |
