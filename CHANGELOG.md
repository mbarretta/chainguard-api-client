# Changelog

## 0.2.0 — 2026-07-02

Refreshed the vendored `v2beta1` spec snapshot to current upstream (42 → 59 paths) and regenerated types.

### Breaking type changes

- Removed `Identity.providers` (also gone from the `PATCH /iam/v2beta1/identities/{identity.uid}` request body).
- Removed `Repo.readme` and the `excludeReadme` query parameter on `GET /registry/v2beta1/repos`.
- Renamed the `CAP_POLICY_GATES_*` values in the `chainguard.capabilities.Capability` union to `CAP_POLICIES_*`.
- `SyncConfig.source` is now required and writable (was `readonly` optional) — code that constructs a partial `SyncConfig`, or that relied on the compiler forcing an `undefined` check when reading it, must be updated. `CustomOverlay.Accounts.User.username`, `CustomOverlay.Accounts.Group.groupname`, and `CustomOverlay.Certificates.AdditionalEntry.name`/`.content` are likewise now required.

### Added

- Libraries service: `GET /libraries/v2beta1/artifacts`, `/artifacts/count`, and `/artifacts/{artifactId}/versions`.
- Registry repo write surface: `POST /registry/v2beta1/repos/{parent}`, `PATCH /registry/v2beta1/repos/{repo.uid}`, `DELETE /registry/v2beta1/repos/{uid}`, plus per-digest `architectures` and `size` endpoints.
- IAM: external group role mappings (list/get/create/delete/batchDelete), terms acceptance (`GET`/`POST /iam/v2beta1/terms/{group}`), `roleBindings:batchCreate`, `identities:lookupIdentity`, `identities:updateIdentityMetadata`, `groups:checkEligibility`, and `accountAssociations:checkAccountAssociation`.
- New schema fields, including `Advisory.severities`, `IdentityProvider.scim`, `IdentityProvider.OIDC.groupsClaim`, and scanner metadata on advisory events.

### Packaging & tooling

- `npm run spec:refresh` codifies the spec refresh (fetch + regenerate); `spec/METADATA.json` records the source URL, fetch time, and sha256 of the snapshot.
- `npm run check` now verifies `src/generated/types.ts` is exactly derived from `spec/openapi.json`.
- The raw spec is no longer shipped in the npm tarball (~296 KB smaller unpacked).
- CJS consumers now resolve `dist/index.d.cts` via a `require`-side `types` export condition.

## 0.1.0 — 2026-05-04

Initial release: typed client wrapper (`createChainguardClient`) over `openapi-fetch` with bearer-token middleware and generated types from the vendored `v2beta1` spec.
