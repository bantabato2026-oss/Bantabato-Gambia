# Bantabato Sprint 64 — Founder Approval Request

## Decision: Authorize isolated Bantabato staging provisioning

**Current status:** **AWAITING FOUNDER APPROVAL**  
**No provisioning or spending has occurred.**

### Recommended option

Authorize evaluation and, only after budget confirmation, provisioning of a **separate WebDev-managed staging deployment** compatible with the current React/Express/tRPC/Drizzle/MySQL architecture. It must have a distinct origin, separate MySQL/TiDB database, private storage namespace, separate OAuth client/callback, staging-only secrets, no-send communications, monitoring, and disposable recovery targets.

If WebDev cannot prove those isolation properties, the operator must stop and request a separate founder-approved compatible provider. No new paid platform is being selected or activated now.

### What approval authorizes

1. Confirm provider capability and current price/limit through the provider console.
2. Provision only an isolated staging target within an approved budget.
3. Configure separate database, storage, OAuth, secret-manager scope, and monitoring.
4. Apply committed migrations and deploy the approved revision.
5. Seed only deterministic fictional A–J accounts.
6. Verify no production database, storage, auth, communications, or payment access.
7. Run synthetic member/staff acceptance and authorized backup/restore checks.

Every step stops on missing identity, owner, approval, isolation, or evidence.

### What approval does not authorize

Production changes, real member data, identity documents, payment activation, SMS/email/analytics activation, shared passwords, secret disclosure, unbounded spending, or use of the public deployment as staging.

### Required founder-provided approvals/resources

- Approved staging provider/project and hostname.
- Maximum initial and monthly budget after provider quote.
- Secret-manager owner and access policy.
- Technical/platform owner acceptance.
- Database/recovery owner acceptance.
- Separate database, storage, OAuth, monitoring, backup, and rollback resource approvals.
- Authorized synthetic tester approval.

### Cost status

No verified current pricing is available in the repository or active project metadata. The current request therefore authorizes **no spend** until a provider quote/limit is supplied and explicitly accepted.

### Risk and rollback

Primary risks are production crossover, secret exposure, accidental real-user communication, unbounded cost, and untested recovery. Mitigations are separate identities/namespaces, least privilege, managed secrets, no-send configuration, synthetic-only data, budget approval, and disposable rollback/recovery rehearsal. If any check fails, stop, preserve evidence, revoke newly granted access if needed, and do not promote or mutate production.

### Approval record

Decision ID: `STAGE-001`  
Approving person/role: **Not recorded**  
Approval timestamp: **Not recorded**  
Budget limit: **Not recorded**  
Technical owner: **OWNER REQUIRED**  
Recovery owner: **OWNER REQUIRED**  
Status: **AWAITING FOUNDER APPROVAL**
