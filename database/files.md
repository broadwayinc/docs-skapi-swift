# Files

Files are attached to records. They follow the record's access group and are served through a CDN.

## Uploading with a record

Pass `files:` to [postRecord](/api-reference/database#postrecord). Each entry is an `UploadFile`:

| field | |
|---|---|
| `name` | The key the file is listed under in the record's `bin`, like a form field name. Several files can share one name. |
| `file` | Where the bytes come from: `.url(URL)` (a local file URL), `.path(String)`, `.data(Data)` or `.stream(InputStream)`. |
| `filename` | The stored file name. Required for `.data` and `.stream`; defaults to the file's own name otherwise. |
| `contentType` | Defaults to a guess from the file name. |

```swift
import Skapi

let skapi = try Skapi(projectId: "<Project ID>")

let rec = try await skapi.postRecord(
    ["caption": "Holiday"],
    config: ["table": ["name": "photos", "access_group": "authorized"]],
    files: [
        UploadFile(name: "picture", file: .url(beachURL)),                                   // from a file URL
        UploadFile(name: "picture", file: .data(pngData), filename: "sunset.png"),           // from memory
        UploadFile(name: "document", file: .path("~/Documents/trip.pdf")),
    ]
)
```

A photo the user picked arrives as `Data` (for example from `PhotosPicker` with `loadTransferable(type: Data.self)`), and a document from `fileImporter` as a file URL. A URL from outside your app's sandbox needs `startAccessingSecurityScopedResource()` while the call reads it.

The files are read and checked before the record is created, so a bad entry throws `INVALID_PARAMETER` and nothing is saved. A file storage refuses afterwards does not fail `postRecord`; use [uploadFiles](#adding-files-to-an-existing-record) when you need to know about each file.

To attach files to an existing record of yours without changing anything else, use `postRecord(config: ["record_id": ...], files: [...])` or `uploadFiles`.

## Adding files to an existing record

[uploadFiles(_:recordId:service:)](/api-reference/database#uploadfiles) takes the same array and a record ID, and reports on each file:

```swift
let result = try await skapi.uploadFiles(
    [UploadFile(name: "picture", file: .url(moreURL))],
    recordId: "<record id>"
)
```

```json
{
  "completed": ["more.jpg"],
  "failed": [],
  "errors": [],
  "bin_endpoints": ["https://..."]
}
```

`completed` lists the files stored and `failed` the ones that were not. `errors` has one `{"file", "name", "error": {"code", "message"}}` per failed file. `bin_endpoints` has one URL per file, in order, and `""` when no upload permit was given.

Files go up one after another, and a refused file does not stop the rest. With five files or more, the upload permits are asked for in batches of 100.

## Files on a record

```swift
let rec = try await skapi.getRecords(["record_id": "<record id>"])["list"]?[0]

for f in rec?["bin"]?["picture"]?.array ?? [] {
    print(f["filename"]?.string ?? "", f["size"]?.int ?? 0, f["url"]?.string ?? "")
}
```

Each file is an object:

```json
{
  "access_group": "authorized",
  "filename": "beach.jpg",
  "url": "https://...",
  "path": "...",
  "size": 482113,
  "uploaded": 1731600000000
}
```

`size` is in bytes and `uploaded` in milliseconds. A file in a `"public"` record has a plain CDN link anyone can open. For other access groups, `url` already carries your sign-in token, so it works for a limited time. Use [getFile](#downloading-files) to read the file or [getFileEndpoint](#links-to-open) for a fresh link.

## Downloading files

Each method takes a file's `url`:

```swift
let url = f["url"]?.string ?? ""

let content = try await skapi.getFile(url)                     // Data
let text = try await skapi.getFileText(url)                    // String, read as UTF-8
let link = try await skapi.getFileEndpoint(url)                // a URL to open, as a String
let info = try await skapi.getFileInfo(url)                    // details, no download
let saved = try await skapi.downloadFile(url, to: localURL)    // writes the file, returns its URL
```

```swift
// for example, in SwiftUI
if let image = UIImage(data: try await skapi.getFile(url)) {
    photo = Image(uiImage: image)
}
```

`getFileInfo` reads the details from the URL itself:

```json
{
  "url": "https://...",
  "filename": "beach.jpg",
  "fileKey": "picture",
  "access_group": "authorized",
  "uploader": "<user id>",
  "record_id": "<record id>",
  "filesize": 482113,
  "uploaded": 1731600000000
}
```

You need access to the record to read its files. Files of records that are not `"public"` need a signed-in user. For a [private](/database/private#private-files) file you were granted access to, skapi-swift fetches the access key for you.

### Links to open

`getFileEndpoint(_:)` returns a link you can hand to `AsyncImage`, `AVPlayer`, a `ShareLink` or Safari. For a file that is not public, the link carries the user's token and works while the session does.

### Links that work without sign-in

`expires:` (seconds) makes a signed link that anyone can open until it expires, without signing in. Making it needs a signed-in user with access to the file.

```swift
let link = try await skapi.getFileEndpoint(url, expires: 3600)
```

On `getFile`, `getFileText` and `downloadFile`, `expires:` downloads the file through such a link. A signed link passed back to these methods is opened as it is. `expires` only works on Skapi file URLs (`INVALID_PARAMETER`: `Expires option can only be used on skapi cdn endpoints.`).

## Removing files

Update the record with `remove_bin`, an array of files from its `bin` or their `url`s:

```swift
let rec = try await skapi.getRecords(["record_id": "<record id>"])["list"]?[0]
let first = rec?["bin"]?["picture"]?[0] ?? .null

try await skapi.postRecord(config: [
    "record_id": rec?["record_id"] ?? .null,
    "remove_bin": [first],   // or [first["url"] ?? .null]
])

// every file on the record
try await skapi.postRecord(config: ["record_id": rec?["record_id"] ?? .null, "remove_bin": .null])
```

An empty array removes nothing.

The files must belong to the record you update.

### Deleting files by URL

[deleteFiles(_:)](/api-reference/database#deletefiles) deletes files by URL without touching anything else on the records. It takes an array of up to 1000 URLs, from any records of yours, and returns the updated records. A link from `getFileEndpoint` works too, and so does the `url` of a file that is not public (it ends in `?t=...`): skapi-swift sends the file's stored address, for any file name, including names with spaces or non-English characters. `remove_bin` takes these URLs the same way.

One case is still read wrong: a name that itself holds an encoded sequence, such as `a%20b.pdf`, deleted through a saved `?t=` URL that this `Skapi` object did not hand out. Pass the file from `bin` to `remove_bin`, for such names.

```swift
let urls = (rec?["bin"]?["picture"]?.array ?? []).compactMap { $0["url"]?.string }
let records = try await skapi.deleteFiles(urls)
```

The whole list is checked first: if any file is refused, none is deleted.

Deleting a record deletes its files too.
