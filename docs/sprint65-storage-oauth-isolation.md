# Bantabato Sprint 65 — Storage and OAuth Isolation

**Status:** No staging storage or OAuth resources were provisioned or activated.

## Storage

The application has Manus built-in storage helpers/proxy and stores media references rather than database file bytes. The current project evidence does not verify a separate staging namespace, bucket, path policy, upload identity, retention policy, or deletion boundary.

A safe staging arrangement requires a distinct private namespace and staging-only upload credentials. Staging tests must use fictional images/documents only. Production object URLs, storage keys, signed URLs, and member media must not be copied into staging.

| Requirement                       | Status                      |
| --------------------------------- | --------------------------- |
| Separate namespace/bucket         | **NOT VERIFIED**            |
| Separate upload permissions       | **NOT VERIFIED**            |
| Production object access denied   | **NOT TESTED**              |
| Staging retention/deletion policy | **NOT VERIFIED**            |
| Fictional A–J media only          | **REQUIRED BEFORE TESTING** |

## OAuth and sessions

The current application uses Manus OAuth with the standard callback route. The current project metadata does not verify a separate staging OAuth client, callback registration, client secret, cookie scope, session signing secret, or account directory.

A safe staging arrangement requires separate OAuth credentials and callback URLs, staging-only cookie/session settings, and synthetic A–J accounts. Login tests must prove that staging sessions cannot authenticate against or mutate the production environment. Real SMS, email, analytics, payment, and other external actions must remain disabled.

| Requirement                       | Status                            |
| --------------------------------- | --------------------------------- |
| Separate OAuth application/client | **NOT VERIFIED**                  |
| Separate callback URL             | **NOT VERIFIED**                  |
| Separate session/cookie scope     | **NOT VERIFIED**                  |
| Staging-only secret scope         | **NOT VERIFIED**                  |
| Synthetic accounts                | **NOT CREATED**                   |
| Real-user communications disabled | **POLICY REQUIRED; NOT EXECUTED** |

## Isolation decision

Storage and OAuth are blocking dependencies for staging. A second deployment URL is insufficient. Keep `STAGE-001` unapproved until these boundaries are demonstrated with non-production resources and auditable evidence.
