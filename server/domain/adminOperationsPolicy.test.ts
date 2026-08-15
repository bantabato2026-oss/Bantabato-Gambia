import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS, canDecideApproval, permissionIsHighImpact, permissionRequiresFreshReauthentication, roleCan, safeStaffNavigation, staffSessionIsUsable } from "./adminOperationsPolicy";

describe("Phase 11 Admin & Operations policy", () => {
  it("separates support, verification, safety, finance, policy, and audit duties", () => {
    expect(roleCan("customer_support_officer", "support.manage")).toBe(true);
    expect(roleCan("customer_support_officer", "safety.actions.create")).toBe(false);
    expect(roleCan("verification_officer", "verification.review")).toBe(true);
    expect(roleCan("verification_officer", "finance.transactions.view")).toBe(false);
    expect(roleCan("finance_officer", "finance.refunds.create")).toBe(true);
    expect(roleCan("read_only_auditor", "audit.view")).toBe(true);
    expect(roleCan("read_only_auditor", "staff.manage")).toBe(false);
  });

  it("marks high-impact permissions while keeping ordinary queue viewing separate", () => {
    expect(permissionIsHighImpact("staff.manage")).toBe(true);
    expect(permissionIsHighImpact("safety.actions.approve")).toBe(true);
    expect(permissionIsHighImpact("notifications.view")).toBe(false);
  });

  it("requires a fresh reauthentication for elevated operational changes", () => {
    expect(permissionRequiresFreshReauthentication("staff.manage")).toBe(true);
    expect(permissionRequiresFreshReauthentication("finance.refunds.approve")).toBe(true);
    expect(permissionRequiresFreshReauthentication("support.manage")).toBe(false);
  });

  it("enforces no self-approval, the required staff role, pending state, and expiry", () => {
    const future = new Date(Date.now() + 60_000);
    expect(canDecideApproval(10, 11, "platform_administrator", "platform_administrator", "pending", future)).toBe(true);
    expect(canDecideApproval(10, 10, "platform_administrator", "platform_administrator", "pending", future)).toBe(false);
    expect(canDecideApproval(10, 11, "finance_officer", "platform_administrator", "pending", future)).toBe(false);
    expect(canDecideApproval(10, 11, "platform_administrator", "platform_administrator", "approved", future)).toBe(false);
    expect(canDecideApproval(10, 11, "platform_administrator", "platform_administrator", "pending", new Date(Date.now() - 1))).toBe(false);
  });

  it("treats revoked and expired staff sessions as unusable", () => {
    expect(staffSessionIsUsable("active", new Date(Date.now() + 60_000))).toBe(true);
    expect(staffSessionIsUsable("revoked", new Date(Date.now() + 60_000))).toBe(false);
    expect(staffSessionIsUsable("active", new Date(Date.now() - 1))).toBe(false);
  });

  it("shows only permission-backed navigation entries while preserving backend checks", () => {
    const support = safeStaffNavigation(DEFAULT_ROLE_PERMISSIONS.customer_support_officer);
    expect(support.map(item => item.label)).toContain("Support");
    expect(support.map(item => item.label)).toContain("Members");
    expect(support.map(item => item.label)).not.toContain("Billing");
    expect(support.map(item => item.label)).not.toContain("Safety Operations");
  });
});
