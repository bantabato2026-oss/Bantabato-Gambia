export function createControlledWorkflowFixtures() {
  const now = new Date("2026-08-22T12:00:00.000Z");
  return {
    now,
    member: {
      id: 101,
      userId: 1001,
      label: "Synthetic member",
      email: "member@example.test",
      profileStatus: "draft" as const,
      searchVisible: true,
      profileVisibility: "members_only" as const,
      deletedAt: null as Date | null,
      coreProfileComplete: false,
      verificationStatus: "not_started" as const,
    },
    marriedMember: { id: 102, userId: 1002, label: "Synthetic married member", email: "married-member@example.test", maritalStatus: "married" as const },
    parent: { userId: 1101, role: "parent" as const, email: "parent@example.test" },
    waliGuardian: { userId: 1102, role: "wali_guardian" as const, email: "wali@example.test" },
    reviewer: { userId: 1201, role: "verification_officer" as const, email: "reviewer@example.test" },
    trustSafetyReviewer: { userId: 1202, role: "trust_safety_officer" as const, email: "safety@example.test" },
    approver: { userId: 1203, role: "platform_administrator" as const, email: "approver@example.test" },
    editorialReviewer: { userId: 1204, role: "content_policy_manager" as const, email: "editorial@example.test" },
    supportOperator: { userId: 1205, role: "customer_support_officer" as const, email: "support@example.test" },
    financeOperator: { userId: 1206, role: "finance_officer" as const, email: "finance@example.test" },
    countryOperator: { userId: 1207, role: "platform_administrator" as const, email: "country-operations@example.test" },
    profilePhotos: [
      { id: 1, photoPurpose: "profile" as const, reviewStatus: "approved" as const, deletedAt: null as Date | null },
      { id: 2, photoPurpose: "profile" as const, reviewStatus: "approved" as const, deletedAt: null as Date | null },
      { id: 3, photoPurpose: "profile" as const, reviewStatus: "approved" as const, deletedAt: null as Date | null },
      { id: 4, photoPurpose: "profile" as const, reviewStatus: "approved" as const, deletedAt: null as Date | null },
      { id: 5, photoPurpose: "profile" as const, reviewStatus: "approved" as const, deletedAt: null as Date | null },
      { id: 6, photoPurpose: "profile" as const, reviewStatus: "rejected" as const, deletedAt: null as Date | null },
      { id: 7, photoPurpose: "identity_document" as const, reviewStatus: "approved" as const, deletedAt: null as Date | null },
      { id: 8, photoPurpose: "profile" as const, reviewStatus: "approved" as const, deletedAt: now },
    ],
    isTestFixture: true as const,
  };
}
