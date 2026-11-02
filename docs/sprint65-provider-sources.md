# Sprint 65 — Provider Sources and Verification Notes

**Research date:** 2026-11-02  
**Rule:** Public provider documentation is capability/pricing evidence only; it is not proof that this Bantabato account is eligible, configured, isolated, or approved.

## TiDB Cloud pricing

The official TiDB Cloud pricing page lists Starter at **$0/month to start**, with free monthly allowance of 25 GiB row storage, 25 GiB columnar storage, and 250M Request Units across up to five eligible instances per organization. It lists usage rates beyond the allowance from $0.10 per million Request Units, $0.20 per GiB-month row storage, and $0.05 per GiB-month columnar storage, with region/provider variation. The same page lists higher plan starting prices and states that storage, backup, data transfer, and other services may be additional. [1]

The official Starter pricing details state that the free quota is issued monthly for up to five instances, with 5 GiB row storage, 5 GiB columnar storage, and 50M Request Units per eligible instance. Scalable instances require a spending limit and may require a payment method; usage is throttled or denied when limits are reached. [2]

These sources support a possible low-cost database option, but they do not verify Bantabato organization eligibility, region, current account quota, separate credentials, backup behavior for this account, or a safe production/staging boundary.

## Manus/WebDev backup and environment evidence

The official Manus service-change guidance states that WebDev Task Data Backup covers supported project records/checkpoints, code/Git data, the Manus-hosted project database, project storage/S3 files, SEO configuration, schedules, and supported project-level application keys/environment variables. It also states that independently managed third-party databases/services are not restored by Manus and that integrations may require reauthorization after restoration. [3]

This confirms a documented platform-level backup/restoration mechanism, but it does not verify a Bantabato backup artifact, a disposable staging restore target, a separate WebDev staging environment, independent staging secrets, a separate OAuth application, or a completed recovery rehearsal.

## Unverified WebDev staging claims

No public source reviewed here verifies that the active Bantabato WebDev project supports a second isolated deployment with independent database, storage, OAuth, secret, rollback, and access controls. The active WebDev status check exposed one running project/public target only. These capabilities remain **NOT VERIFIED**, not assumed from the existence of a public deployment URL.

## References

[1]: https://www.pingcap.com/tidb-cloud-pricing/ "TiDB Cloud Pricing"
[2]: https://www.pingcap.com/tidb-cloud-starter-pricing-details/ "TiDB Cloud Starter Pricing Details"
[3]: https://help.manus.im/en/articles/16354507-service-change-overview-how-service-change-affects-your-website-projects-and-websites "How Service Change Affects Your WebDev Projects and Websites"
