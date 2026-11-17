# Security Specification — RizMadagascar v6.0 Firestore

## 1. Data Invariants
1. **Default Deny Catch-All**: All unspecified Firestore paths return `PERMISSION_DENIED`.
2. **PII Split-Collection Isolation**: Email and UID (`UserPrivateProfile`) live exclusively under `/users/{userId}/private/profile` and are readable/writable strictly by `request.auth.uid == userId`. No blanket `allow read: if isSignedIn()` or `allow list` exists on user documents.
3. **Verified Email Mandate**: Every create, update, and delete requires `request.auth != null && request.auth.token.email_verified == true`.
4. **Immutable Ownership & Temporal Integrity**:
   - `projects/{projectId}` enforces `data.ownerId == request.auth.uid` on create and `incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt` on update.
   - `createdAt` and `updatedAt` must strictly equal `request.time` (server timestamps).
5. **Path Poisoning & Native Map/Array Bounds**:
   - All document IDs (`userId`, `docId`, `projectId`) are validated with `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `size <= 128`) on single-document operations (`get`, `create`, `update`, `delete`).
   - `savedScenarios` is strictly bounded to `<= 25` elements and validated as `list` with map entries.
   - No `JSON.stringify` payload strings: `assumptions` and `pestelAnalysis` use native Firestore `map` types.
6. **Rule-Enforced List Queries**: `allow list` on `/projects` explicitly requires `isSignedIn() && existing().ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts `projects/proj_1` create -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Create**: User A (`uidA`) creates `projects/proj_1` with `ownerId: "uidB"` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Read/List Scraping**: User A queries `/projects` without `where('ownerId', '==', uidA)` or calls `get(/projects/proj_B)` -> `PERMISSION_DENIED`.
4. **Ghost Field Shadow Update**: Owner updates `projects/proj_1` with extra key `isAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` rejection).
5. **Owner Hijack on Update**: Owner attempts to transfer `ownerId` to `"uidB"` -> `PERMISSION_DENIED` (`incoming().ownerId == existing().ownerId`).
6. **Immutable Timestamp Tampering**: Client sends past ISO/client `Timestamp` instead of `request.time` for `createdAt` or `updatedAt` -> `PERMISSION_DENIED`.
7. **Path ID Poisoning**: Client writes to `/projects/bad$id/../../../x` or >128-char ID -> `PERMISSION_DENIED` (`isValidId`).
8. **PII Cross-User Read**: User B attempts `get(/users/uidA/private/profile)` -> `PERMISSION_DENIED`.
9. **Wrong Private Doc ID**: User A attempts `create(/users/uidA/private/shadow)` -> `PERMISSION_DENIED` (`docId == 'profile'`).
10. **Array Exhaustion Attack**: Owner writes `savedScenarios` with 26+ items -> `PERMISSION_DENIED` (`size() <= 25`).
11. **Type Poisoning on Whitelisted Key**: Owner updates `assumptions` to a raw `string` instead of `map` -> `PERMISSION_DENIED` (`data.assumptions is map`).
12. **Notes Denial-of-Wallet Payload**: Owner writes `dashboardReportNotes` exceeding 10,000 characters -> `PERMISSION_DENIED` (`size() <= 10000`).
