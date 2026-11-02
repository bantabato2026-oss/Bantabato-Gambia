# Bantabato Sprint 63 — Secure Credential Ownership

**Status:** **POLICY DOCUMENTED — OWNER AND SECRET-MANAGER SCOPE REQUIRED**

## Non-negotiable controls

- Store secrets only in the deployment platform's approved secret manager.
- Restrict read/write access to explicitly accepted technical/platform owners.
- Keep staging and production credentials, OAuth clients, storage namespaces, and database identities separate.
- Never place passwords, tokens, private keys, cookies, identity documents, or secret values in source code, logs, screenshots, reports, issues, or Git history.
- Never use shared founder passwords; use named accounts and least privilege.
- Do not print secrets while verifying configuration; record only redacted resource identity and pass/fail evidence.
- Rotate credentials after owner changes, suspected exposure, or provider access changes.
- Revoke access immediately when an owner leaves the role or approval expires.

## Ownership record

For each secret group, record outside this document: secret group ID, environment, provider/resource identity, owning role, approved readers, rotation interval, last rotation date, revocation trigger, and approval reference. Do not record the secret value.

## Access sequence

1. Founder approves the environment and accountable technical owner.
2. Owner creates or receives a named account through the provider's secure process.
3. Secret manager stores the value and grants least-privilege access to the accepted owner.
4. Operator verifies presence using a redacted check; values never enter terminal output or evidence files.
5. Rotation/revocation evidence is recorded with timestamp and approval reference.

## Current result

No secret-manager project, owner, credential, or access grant was supplied or changed in Sprint 63. No secrets were requested in project documentation and no provider access was activated.
