# Bantabato Sprint 65 — WebDev Staging Feasibility

**Decision:** `STAGE-001` remains **AWAITING FOUNDER APPROVAL**.  
**Provisioning:** None.  
**Spend:** None authorized.

## Evidence reviewed

The active project status confirms one running WebDev-managed Bantabato project and one public deployment target. The repository is a React 19/tRPC 11/Express 5 application using Drizzle ORM with a MySQL dialect. The active project metadata identifies a MySQL-compatible TiDB Cloud production configuration, Manus built-in storage helpers, and Manus OAuth configuration. GitHub Actions provides disposable MySQL 8.4 CI with schema application and persistence tests.

No production values, credentials, real member data, or external service settings were copied into this report.

## Capability classification

### Verified in the current project

- One WebDev-managed project is active and deployable.
- The current application can connect to MySQL/TiDB through `DATABASE_URL` and uses Drizzle migrations.
- The application has Manus OAuth and built-in storage integration points.
- Disposable MySQL 8.4 CI can apply the committed schema and run persistence authority tests.
- The active project can run a development server and has a public deployment target.

### Documented by provider, but not account-verified

- Manus documents Task Data Backup coverage for supported WebDev project data, code/Git data, the Manus-hosted project database, storage/S3 files, and supported project-level configuration. [1]
- TiDB Cloud publicly documents Starter free quotas, usage billing, spending limits, and separate instance concepts. [2] [3]

### Not verified for Bantabato

- A second isolated WebDev deployment/project.
- Independent staging environment variables and secrets.
- A separate storage namespace or bucket with distinct upload permissions.
- A separate OAuth application, callback URL, session/cookie scope, and synthetic-account boundary.
- Independent deployment promotion and rollback controls.
- Private staging access controls.
- A separate TiDB database/instance with credentials unable to access production.
- A staging backup artifact, restore target, or rollback rehearsal target.
- A staging-only monitoring destination and alert owner.

### Unsupported or unsafe to assume

The current evidence does not support using the existing public deployment as staging. A different URL alone would not prove database, storage, OAuth, secret, or monitoring isolation. No provisioning or external activation was performed.

## Recommendation

Do not provision yet. `STAGE-001` should authorize only a controlled capability and price confirmation followed by provisioning if, and only if, the platform proves distinct origin, database, storage, OAuth, secret, monitoring, and recovery boundaries. If WebDev cannot prove those properties, keep staging blocked and request a separate founder-approved compatible provider.

## References

[1]: https://help.manus.im/en/articles/16354507-service-change-overview-how-service-change-affects-your-website-projects-and-websites "How Service Change Affects Your WebDev Projects and Websites"
[2]: https://www.pingcap.com/tidb-cloud-pricing/ "TiDB Cloud Pricing"
[3]: https://www.pingcap.com/tidb-cloud-starter-pricing-details/ "TiDB Cloud Starter Pricing Details"
