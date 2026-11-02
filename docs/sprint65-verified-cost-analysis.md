# Bantabato Sprint 65 — Verified Cost Analysis

**Research date:** 2026-11-02  
**Currency:** USD where the provider publishes USD pricing.  
**Spend authorized:** **$0**

## Pricing that is publicly verified

### TiDB Cloud Starter

The official TiDB Cloud pricing page lists Starter at **$0/month to start**, with a free monthly allowance of 25 GiB row storage, 25 GiB columnar storage, and 250M Request Units across up to five eligible instances per organization. It lists rates beyond the allowance from $0.10 per million Request Units, $0.20 per GiB-month row storage, and $0.05 per GiB-month columnar storage. Rates vary by region and cloud provider, and storage, backup, data transfer, and other charges may apply. [1]

The official Starter detail page states that each eligible instance can receive 5 GiB row storage, 5 GiB columnar storage, and 50M Request Units monthly within the organization allowance. Scalable instances require a spending limit and may require a payment method; hitting limits can throttle or deny new connections. [2]

**Interpretation for Bantabato:** TiDB Starter is a plausible low-cost database candidate, but the current organization’s eligibility, region, remaining quota, account billing state, separate staging identity, backup cost, and actual monthly usage are not verified.

## Pricing not verified

| Resource                          | Price status           | Why it cannot be stated as a quote                                 |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| WebDev staging deployment         | **PRICE NOT VERIFIED** | No public WebDev staging price or account plan/quote was available |
| WebDev environment-scoped secrets | **PRICE NOT VERIFIED** | Capability and plan entitlement are not account-verified           |
| Manus storage namespace/egress    | **PRICE NOT VERIFIED** | Current quota and staging namespace are not verified               |
| Manus OAuth staging client        | **PRICE NOT VERIFIED** | Separate client capability/fees are not verified                   |
| Monitoring and alert destination  | **PRICE NOT VERIFIED** | Provider, plan, retention, and destination are not selected        |
| Backup/restore target             | **PRICE NOT VERIFIED** | Target and retention are not selected                              |
| Domain/hostname                   | **PRICE NOT VERIFIED** | Additional domain resource is not selected                         |

## Founder budget fields

- Maximum initial budget: **NOT PROVIDED**
- Maximum monthly budget: **NOT PROVIDED**
- Approved provider/services: **NOT PROVIDED**
- Payment method or billing authorization: **NOT PROVIDED**
- Cost ceiling enforcement: **REQUIRED BEFORE PROVISIONING**

No free tier is declared suitable by default. Any future quote must record provider, service, billing unit, currency, source URL or console evidence, verification date, expected usage, free-tier limits, and variable charges.

## References

[1]: https://www.pingcap.com/tidb-cloud-pricing/ "TiDB Cloud Pricing"
[2]: https://www.pingcap.com/tidb-cloud-starter-pricing-details/ "TiDB Cloud Starter Pricing Details"
