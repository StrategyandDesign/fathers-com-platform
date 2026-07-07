# E-sign integration bridge — for the e-sign team

This is the integration surface between Fathers.com and the RecordMade e-sign
API. It is prepped for you to review, confirm against the live contract, and
approve before deploy. Nothing here reimplements signing. All crypto (PAdES,
RFC 3161, Ed25519) and the audit ledger stay in your API.

## Why it is shaped this way

The e-sign API token is a secret. It must never reach the browser. So the
browser calls a single server-side function, and that function holds the token
and proxies to your API. Two files:

- `supabase/functions/esign-bridge/index.ts` — the server bridge you own.
  Holds the credentials, authenticates the father, authorizes the request
  against the award record, then calls your API.
- `assets/js/esign-client.js` — the browser side. Calls the bridge only.
  No credentials, no direct API calls.

## The one flow it covers today

A father self-signs his own certificate, and only after an admin has approved it.

1. Admin approves the award (`certificate_awards.status = 'approved'`).
2. Browser calls `ESIGN.selfSignCertificate(awardId)`.
3. Bridge verifies the caller's Supabase JWT, confirms the award is the
   caller's and is `approved` and not already signed.
4. Bridge calls your API: self-sign create, then verify bundle, then a ledger
   audit event.
5. Bridge writes `envelope_id`, `signed_at`, and `status = 'signed'` back on
   the award.

## What you confirm and adjust

The endpoint paths and payloads in the bridge are inferred from your published
OpenAPI. Confirm each and edit the marked block in `index.ts`:

- Self-sign: assumed `POST /sign/self-sign` taking a `SelfSignCreate` and
  returning a `SelfSignResult` with an `envelope_id` (or `id`).
- Verify: assumed `GET /verify/bundle?envelope_id=...` returning a
  `VerifyBundleResult`.
- Ledger: assumed `POST /ledgers/events` taking a `LedgerEventCreate`.

Confirm the exact field names for `SelfSignCreate` (signer identity, assurance
level, signature method, metadata) and how the signable certificate document is
supplied — inline, by reference, or generated on your side from the metadata we
pass (course, hours, father's name, award id).

## Deploy

```
supabase secrets set ESIGN_BASE_URL="https://<your-esign-host>"
supabase secrets set ESIGN_API_TOKEN="<service token>"
supabase functions deploy esign-bridge
```

Until the secrets are set, the bridge returns `503 not configured` and the
certificate flow shows "signing is being set up," so nothing half-works.

## Data the bridge relies on

From `certificate_accountability.sql`:

- `certificate_awards` — the record of approval and signature. The bridge reads
  it to authorize, and writes `envelope_id` / `signed_at` / `status` after.
- `certificate_courses` — title and hours for the certificate subject line.

## Security notes for your review

- The browser never sees `ESIGN_API_TOKEN`. It lives only in Supabase secrets,
  read by the function at runtime.
- Authorization is server-side: the bridge re-checks ownership and approval
  against the database using the service role, not the client's word.
- The award is single-use for signing: once `envelope_id` is set, a repeat call
  returns `409 already signed`.
- CORS is currently open (`*`) for prototyping. Lock it to the production origin
  before launch.
- No personal data is placed in URLs. The only query parameter is the opaque
  `envelope_id` returned by your own API.

## Not yet wired (by design, pending your review)

- Multi-recipient envelopes and third-party signer routing. The bridge covers
  self-sign only for now; the envelope/recipient endpoints are in your API and
  can be added here once the self-sign path is approved.
- Webhook callbacks from your API back to Fathers.com. If you push status
  changes, we can add a second function to receive them.
