# API Reference

Every method of skapi-swift 2.7.0. `Skapi` is an actor: each call is `try await`. Each one throws [`SkapiError`](/introduction/errors) on failure. What skapi-js has and this SDK leaves out is listed in [Not Included](/introduction/not-included).

## [Connection](/api-reference/connection)

| method | |
|---|---|
| [`Skapi(projectId:storage:timeout:targetCDN:encryption:urlSession:observeAppLifecycle:)`](/api-reference/connection#skapi) | connects to one project |
| [`getConnectionInfo(refresh:)`](/api-reference/connection#getconnectioninfo) | project name and settings |
| [`appDidReturn()`](/api-reference/connection#appdidreturn) | tells the SDK the app came back to the foreground |
| [`SkapiStorage`, `KeychainStorage`, `MemoryStorage`, `FileStorage`](/api-reference/connection#storage) | where the session is kept |
| [`FetchOptions`](/api-reference/connection#fetchoptions) | paging |
| [`JSON`](/api-reference/connection#json) | the value type of data, queries and answers |
| [`SkapiError`](/api-reference/connection#skapierror) | the error every method throws |

## [Authentication](/api-reference/authentication)

| method | |
|---|---|
| [`signup(_:option:)`](/api-reference/authentication#signup) | creates an account |
| [`resendSignupConfirmation()`](/api-reference/authentication#resendsignupconfirmation) | sends the confirmation e-mail again |
| [`login(email:username:password:)`](/api-reference/authentication#login) | signs in |
| [`verifyMFA(code:)`](/api-reference/authentication#verifymfa) | finishes a login that needs an authenticator code |
| [`logout(global:)`](/api-reference/authentication#logout) | signs out |
| [`getProfile(refreshToken:)`](/api-reference/authentication#getprofile) | the signed-in user's profile |
| [`loginWithToken(idToken:accessToken:refreshToken:)`](/api-reference/authentication#loginwithtoken) | adopts tokens from another sign-in |
| [`updateProfile(_:)`](/api-reference/authentication#updateprofile) | changes the user's profile |
| [`changePassword(currentPassword:newPassword:)`](/api-reference/authentication#changepassword) | changes the password |
| [`forgotPassword(email:template:)`](/api-reference/authentication#forgotpassword) | sends a password reset code |
| [`resetPassword(email:code:newPassword:)`](/api-reference/authentication#resetpassword) | sets a new password with the code |
| [`verifyEmail(code:template:)`](/api-reference/authentication#verifyemail) | sends or checks an e-mail verification code |
| [`lastVerifiedEmail(revert:)`](/api-reference/authentication#lastverifiedemail) | the last verified e-mail |
| [`disableAccount()`](/api-reference/authentication#disableaccount) | disables the user's own account |
| [`recoverAccount(redirect:)`](/api-reference/authentication#recoveraccount) | sends the recovery e-mail to a disabled account |
| [`openIdLogin(token:id:merge:template:)`](/api-reference/authentication#openidlogin) | signs in through an OpenID provider |
| [`anonymousLogin()`](/api-reference/authentication#anonymouslogin) | a temporary account without e-mail or password |
| [`verifyAnonymousSession()`](/api-reference/authentication#verifyanonymoussession) | checks a restored temporary account still exists |
| [`setupMFA(issuer:accountName:)`](/api-reference/authentication#setupmfa) / [`enableMFA(code:)`](/api-reference/authentication#enablemfa) / [`disableMFA()`](/api-reference/authentication#disablemfa) / [`getMFAStatus()`](/api-reference/authentication#getmfastatus) | two-step login with an authenticator app |

## [Database](/api-reference/database)

| method | |
|---|---|
| [`postRecord(_:config:files:)`](/api-reference/database#postrecord) | creates or updates a record |
| [`postRecords(_:)`](/api-reference/database#postrecords) | many records in few requests |
| [`getRecords(_:fetchOptions:)`](/api-reference/database#getrecords) | reads records |
| [`deleteRecords(_:fetchOptions:)`](/api-reference/database#deleterecords) | deletes records |
| [`getTables`](/api-reference/database#gettables) / [`getTags`](/api-reference/database#gettags) / [`getIndexes`](/api-reference/database#getindexes) / [`getUniqueId`](/api-reference/database#getuniqueid) | what the database holds |
| [`uploadFiles(_:recordId:service:)`](/api-reference/database#uploadfiles) | attaches files to a record |
| [`getFile`](/api-reference/database#getfile) / [`getFileText`](/api-reference/database#getfiletext) / [`getFileEndpoint`](/api-reference/database#getfileendpoint) / [`getFileInfo`](/api-reference/database#getfileinfo) / [`downloadFile`](/api-reference/database#downloadfile) | reads a file, or makes a link to it |
| [`deleteFiles(_:)`](/api-reference/database#deletefiles) | removes files from records |
| [`grantPrivateRecordAccess`](/api-reference/database#grantprivaterecordaccess) / [`removePrivateRecordAccess`](/api-reference/database#removeprivaterecordaccess) / [`listPrivateRecordAccess`](/api-reference/database#listprivaterecordaccess) / [`requestPrivateRecordAccessKey`](/api-reference/database#requestprivaterecordaccesskey) | sharing private records |

## [Encryption](/api-reference/encryption)

| method | |
|---|---|
| [`EncryptionOptions`](/api-reference/encryption#encryptionoptions) | turns encryption on, in `Skapi(projectId:encryption:)` |
| [`getEncryptionStatus()`](/api-reference/encryption#getencryptionstatus) | locked, unlocked or disabled |
| [`unlockEncryption(password:)`](/api-reference/encryption#unlockencryption) / [`lockEncryption(forgetDevice:)`](/api-reference/encryption#lockencryption) | opens or forgets the user's keys |
| [`unlockEncryptionWithRecoveryCode(_:password:)`](/api-reference/encryption#unlockencryptionwithrecoverycode) / [`regenerateEncryptionRecoveryCode()`](/api-reference/encryption#regenerateencryptionrecoverycode) | encryption recovery codes (the first one is shown once in `getConnectionInfo()`) |
| [`pinPeerKey(userId:fingerprint:)`](/api-reference/encryption#pinpeerkey) | trusts another user's key for sharing |
| [`isWithheld(_:)`](/api-reference/encryption#iswithheld) | tells the placeholder of undecryptable data apart |

## [Users](/api-reference/users)

| method | |
|---|---|
| [`getUsers(_:fetchOptions:)`](/api-reference/users#getusers) | searches the project's users |
| [`subscribe(_:)`](/api-reference/users#subscribe) / [`unsubscribe(_:)`](/api-reference/users#unsubscribe) | subscribes to another user |
| [`blockSubscriber(_:)`](/api-reference/users#blocksubscriber) / [`unblockSubscriber(_:)`](/api-reference/users#unblocksubscriber) | blocks a subscriber |
| [`getSubscriptions(_:fetchOptions:)`](/api-reference/users#getsubscriptions) | who subscribes to whom |
| [`getFeed(_:fetchOptions:)`](/api-reference/users#getfeed) | records from the users you subscribe to |
| [`subscribeNewsletter(_:)`](/api-reference/users#subscribenewsletter) / [`unsubscribeNewsletter(group:)`](/api-reference/users#unsubscribenewsletter) | newsletter subscription |
| [`getNewsletters(_:fetchOptions:)`](/api-reference/users#getnewsletters) / [`getNewsletterSubscription(_:fetchOptions:)`](/api-reference/users#getnewslettersubscription) | sent newsletters and the user's subscriptions |
| [`sendInquiry(_:)`](/api-reference/users#sendinquiry) | sends a message to the project owner |

## [Realtime](/api-reference/realtime)

| method | |
|---|---|
| [`connectRealtime(_:)`](/api-reference/realtime#connectrealtime) / [`closeRealtime()`](/api-reference/realtime#closerealtime) | opens or closes the realtime connection |
| [`joinRealtime(group:)`](/api-reference/realtime#joinrealtime) | joins or leaves a group |
| [`postRealtime(_:recipient:notification:)`](/api-reference/realtime#postrealtime) | sends to a user or to the group |
| [`getRealtimeGroups(_:fetchOptions:)`](/api-reference/realtime#getrealtimegroups) / [`getRealtimeUsers(_:fetchOptions:)`](/api-reference/realtime#getrealtimeusers) | who is connected where |
| [`RealtimeEvent`](/api-reference/realtime#realtimeevent) | what the callback receives |

## [API Bridge](/api-reference/api-bridge)

| method | |
|---|---|
| [`forwardRequest(_:form:multipart:onStream:)`](/api-reference/api-bridge#forwardrequest) | calls another API through Skapi, with your client secrets |
| [`forwardRequestPoll(_:poll:url:method:onStream:service:owner:notify:)`](/api-reference/api-bridge#forwardrequestpoll) / [`forwardRequestStream(_:options:onStream:)`](/api-reference/api-bridge#forwardrequeststream) | waits for a queued or streamed answer |
| [`forwardRequestFinalize(_:data:options:)`](/api-reference/api-bridge#forwardrequestfinalize) | stores a streamed request's final answer |
| [`forwardRequestHistory(_:fetchOptions:)`](/api-reference/api-bridge#forwardrequesthistory) | past forwarded requests and their answers |
| [`forwardRequestStatus(_:options:)`](/api-reference/api-bridge#forwardrequeststatus) / [`forwardRequestQueueCounters(_:options:)`](/api-reference/api-bridge#forwardrequestqueuecounters) | where many requests and queues stand, in one call |
| [`forwardRequestRead(_:)`](/api-reference/api-bridge#forwardrequestread) | one request in full, whatever its state |
| [`onRequestStatus(_:)`](/api-reference/api-bridge#onrequeststatus) / [`isRequestStatusLive()`](/api-reference/api-bridge#onrequeststatus) | status push for requests sent with `notify` |
| [`cancelForwardRequest(_:)`](/api-reference/api-bridge#cancelforwardrequest) / [`forwardRequestQueueCount(_:)`](/api-reference/api-bridge#forwardrequestqueuecount) | queue control |
| [`FormPart`](/api-reference/api-bridge#formpart) | one part of a multipart body |

## [Tickets](/api-reference/tickets)

| method | |
|---|---|
| [`consumeTicket(ticketId:method:data:auth:)`](/api-reference/tickets#consumeticket) | calls a ticket |
| [`getTickets(_:fetchOptions:)`](/api-reference/tickets#gettickets) | the project's tickets |
| [`getConsumedTickets(_:fetchOptions:)`](/api-reference/tickets#getconsumedtickets) | the user's own ticket calls |
