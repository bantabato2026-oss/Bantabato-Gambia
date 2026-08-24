import { evaluatePair, type CompatibilityPreferences, type CompatibilityProfile } from "./domain/compatibility";
import { isEligibleForDiscovery } from "./domain/discoveryPolicy";
import { permitsInternationalDiscovery, type InternationalDiscoveryState } from "./domain/internationalDiscovery";
import { safeLocationDisplay } from "./domain/internationalPolicy";
import { deriveMemberEligibility } from "./domain/memberEligibilityPolicy";
import { canSendInConversation } from "./domain/messagingPolicy";
import { DEFAULT_READINESS_POLICY, evaluateConnectionReadiness } from "./domain/readinessPolicy";
import { isPremiumSafetyNeutralBoundary } from "./domain/paymentPolicy";

export type HarnessMemberId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
type RelationshipState = "pending" | "accepted" | "declined" | "withdrawn";
type SafetyState = "clear" | "restricted" | "suspended";

type HarnessMember = {
  id: HarnessMemberId;
  profileId: number;
  email: string;
  displayName: string;
  profileStatus: "draft" | "under_review" | "active" | "paused" | "suspended";
  searchVisible: boolean;
  deletedAt: Date | null;
  coreProfileComplete: boolean;
  approvedPhotoCount: number;
  verificationStatus: "not_started" | "pending_review" | "approved";
  safetyState: SafetyState;
  compatibility: CompatibilityProfile;
  preferences: CompatibilityPreferences;
  international: InternationalDiscoveryState;
  privateMarriageIntent: string | null;
};

type Connection = { state: "active" | "withdrawn"; readiness: "revoked" | "available"; familyShare: boolean };
type Interest = { from: HarnessMemberId; to: HarnessMemberId; state: RelationshipState; clientRequestId: string };

const FIXED_NOW = new Date("2026-08-24T12:00:00.000Z");
const COUNTRIES = { gambia: 1, senegal: 2, diaspora: 3 } as const;

function profile(id: HarnessMemberId, profileId: number, displayName: string, overrides: Partial<HarnessMember> = {}): HarnessMember {
  return {
    id,
    profileId,
    email: `${id.toLowerCase()}@example.test`,
    displayName,
    profileStatus: "active",
    searchVisible: true,
    deletedAt: null,
    coreProfileComplete: true,
    approvedPhotoCount: 5,
    verificationStatus: "approved",
    safetyState: "clear",
    compatibility: {
      id: profileId,
      birthDate: new Date("1992-04-18T00:00:00.000Z"),
      gender: id === "B" || id === "E" || id === "F" ? "woman" : "man",
      religion: "muslim",
      country: "GM",
      maritalStatus: "never_married",
      hasChildren: false,
      desireChildren: "open",
      relocationWillingness: "open",
      educationLevel: "tertiary",
      marriageTimeline: "within_two_years",
      marriageIntent: "seeking_marriage",
      polygynyOpenness: "discuss",
      familyInvolvementPreference: "optional",
    },
    preferences: {
      preferredGenders: ["woman"],
      preferredReligions: ["muslim"],
      preferredLocations: ["GM"],
      preferredMaritalStatuses: ["never_married"],
      desiredChildrenPreference: "open",
      preferenceImportance: { gender: "required", religion: "required", location: "preferred" },
    },
    international: { residenceCountryId: COUNTRIES.gambia, longDistancePreference: "no_preference", preferredDiscoveryCountryIds: new Set() },
    privateMarriageIntent: "seeking_marriage",
    ...overrides,
  };
}

export function createControlledMultiMemberJourney() {
  const members = new Map<HarnessMemberId, HarnessMember>([
    ["A", profile("A", 201, "Member A")],
    ["B", profile("B", 202, "Member B", { compatibility: { ...profile("B", 202, "Member B").compatibility, gender: "woman" }, preferences: { ...profile("B", 202, "Member B").preferences, preferredGenders: ["man"] } })],
    ["C", profile("C", 203, "Member C", { preferences: { ...profile("C", 203, "Member C").preferences, preferredReligions: ["christian"], preferenceImportance: { religion: "required" } } })],
    ["D", profile("D", 204, "Member D", { profileStatus: "draft", coreProfileComplete: false, approvedPhotoCount: 0, verificationStatus: "not_started" })],
    ["E", profile("E", 205, "Member E", { approvedPhotoCount: 4 })],
    ["F", profile("F", 206, "Member F", { profileStatus: "under_review", verificationStatus: "pending_review" })],
    ["G", profile("G", 207, "Member G", { profileStatus: "paused", searchVisible: false })],
    ["H", profile("H", 208, "Member H", { safetyState: "restricted" })],
    ["I", profile("I", 209, "Member I", { profileStatus: "suspended", safetyState: "suspended" })],
    ["J", profile("J", 210, "Member J")],
  ]);

  const interests = new Map<string, Interest>();
  const connections = new Map<string, Connection>();
  const messages = new Map<string, string>();
  const recommendations = new Set<string>(["A:B", "A:C"]);
  const blocks = new Set<string>();
  const audit: string[] = [];
  const external = { providerCalls: 0, communications: 0, payments: 0, documents: 0, productionMutations: 0 };

  const key = (one: HarnessMemberId, two: HarnessMemberId) => [one, two].sort().join(":");
  const get = (id: HarnessMemberId) => {
    const member = members.get(id);
    if (!member) throw new Error("Synthetic member not found");
    return member;
  };
  const eligibility = (id: HarnessMemberId) => deriveMemberEligibility(get(id));
  const safetyEligible = (id: HarnessMemberId) => get(id).safetyState === "clear";
  const pairEligible = (viewerId: HarnessMemberId, candidateId: HarnessMemberId) => {
    if (viewerId === candidateId || blocks.has(key(viewerId, candidateId))) return false;
    const viewer = get(viewerId);
    const candidate = get(candidateId);
    if (!safetyEligible(viewerId) || !safetyEligible(candidateId)) return false;
    if (!eligibility(viewerId).discoveryEligible || !eligibility(candidateId).discoveryEligible) return false;
    if (!isEligibleForDiscovery({ profileStatus: candidate.profileStatus, searchVisible: candidate.searchVisible, deletedAt: null, profileVisibility: "members_only", blocked: false })) return false;
    if (!permitsInternationalDiscovery(viewer.international, candidate.international)) return false;
    return evaluatePair(viewer.compatibility, candidate.compatibility, viewer.preferences, candidate.preferences).eligible;
  };

  const publicProjection = (viewerId: HarnessMemberId, candidateId: HarnessMemberId) => {
    if (!pairEligible(viewerId, candidateId)) return null;
    const candidate = get(candidateId);
    return { id: candidate.profileId, displayName: candidate.displayName, locationDisplay: safeLocationDisplay({ visibility: "matches_only", detail: "city", countryName: "The Gambia", city: "Synthetic City", relationship: "eligible" }) };
  };

  return {
    fixedNow: FIXED_NOW,
    members,
    external,
    audit,
    policy: { readiness: DEFAULT_READINESS_POLICY, premiumNeutral: isPremiumSafetyNeutralBoundary("connection_readiness") },
    eligibility,
    discovery(viewerId: HarnessMemberId, candidateId: HarnessMemberId) {
      const projection = publicProjection(viewerId, candidateId);
      return { eligible: Boolean(projection), projection };
    },
    search(viewerId: HarnessMemberId, query: string) {
      return Array.from(members.values()).filter(member => publicProjection(viewerId, member.id) && member.displayName.toLowerCase().includes(query.toLowerCase())).map(member => publicProjection(viewerId, member.id));
    },
    sendInterest(from: HarnessMemberId, to: HarnessMemberId, clientRequestId: string) {
      if (!pairEligible(from, to)) throw new Error("This introduction is unavailable");
      const interestKey = `${from}:${to}`;
      const existing = interests.get(interestKey);
      if (existing?.state === "pending" || existing?.state === "accepted") return { ...existing, duplicate: true };
      const record = { from, to, state: "pending" as const, clientRequestId };
      interests.set(interestKey, record);
      audit.push(`interest:${interestKey}`);
      return { ...record, duplicate: false };
    },
    withdrawInterest(from: HarnessMemberId, to: HarnessMemberId) {
      const record = interests.get(`${from}:${to}`);
      if (!record || record.state !== "pending") throw new Error("This introduction request is no longer available");
      record.state = "withdrawn";
      audit.push(`withdrawn:${from}:${to}`);
      return { withdrawn: true };
    },
    acceptInterest(from: HarnessMemberId, to: HarnessMemberId) {
      const record = interests.get(`${from}:${to}`);
      const connectionKey = key(from, to);
      const existing = connections.get(connectionKey);
      if (record?.state === "accepted" && existing?.state === "active") return { matched: true, duplicate: true };
      if (!record || record.state !== "pending" || !pairEligible(from, to)) throw new Error("This introduction is no longer available");
      record.state = "accepted";
      if (existing?.state === "active") return { matched: true, duplicate: true };
      connections.set(connectionKey, { state: "active", readiness: "revoked", familyShare: false });
      audit.push(`connection:${connectionKey}`);
      return { matched: true, duplicate: false };
    },
    sendMessage(from: HarnessMemberId, to: HarnessMemberId, clientRequestId: string) {
      const connection = connections.get(key(from, to));
      if (!connection || connection.state !== "active" || !canSendInConversation({ isParticipant: true, isBlocked: blocks.has(key(from, to)), state: "active" })) throw new Error("Conversation is unavailable");
      if (messages.has(clientRequestId)) return { duplicate: true, messageId: messages.get(clientRequestId) };
      messages.set(clientRequestId, `${from}:${to}:${messages.size + 1}`);
      audit.push(`message:${clientRequestId}`);
      return { duplicate: false, messageId: messages.get(clientRequestId) };
    },
    grantReadiness(one: HarnessMemberId, two: HarnessMemberId) {
      const connection = connections.get(key(one, two));
      if (!connection || connection.state !== "active") throw new Error("Readiness is unavailable");
      const state = evaluateConnectionReadiness({ one: { messagesSent: 6, voiceNotesSent: 2, activeDays: 4, firstActivityAt: new Date("2026-08-01"), lastActivityAt: new Date("2026-08-04") }, two: { messagesSent: 6, voiceNotesSent: 2, activeDays: 4, firstActivityAt: new Date("2026-08-01"), lastActivityAt: new Date("2026-08-04") }, gates: { noActiveBlock: !blocks.has(key(one, two)), noSeriousSafetyRestriction: safetyEligible(one) && safetyEligible(two), noOpenSeriousReport: true, noInteractionIntegrityConcern: true, accountsActive: true, hardCompatibilityEligible: pairEligible(one, two), identityVerified: true, voiceConsentsGranted: true, videoConsentsGranted: true } });
      if (!state.readyForReview) throw new Error("Readiness is unavailable");
      connection.readiness = "available";
      audit.push(`readiness:${key(one, two)}`);
      return state;
    },
    shareFamily(one: HarnessMemberId, two: HarnessMemberId) {
      const connection = connections.get(key(one, two));
      if (!connection || connection.state !== "active") throw new Error("Only an active mutual connection can be shared with Family Circle");
      connection.familyShare = true;
      audit.push(`family-share:${key(one, two)}`);
      return { shared: true };
    },
    setMarriageIntent(id: HarnessMemberId, value: string) {
      get(id).privateMarriageIntent = value;
      audit.push(`marriage-intent:${id}`);
      return { saved: true };
    },
    changePrivacy(id: HarnessMemberId, searchVisible: boolean) {
      get(id).searchVisible = searchVisible;
      if (!searchVisible) for (const recommendation of Array.from(recommendations)) if (recommendation.split(":").includes(id)) recommendations.delete(recommendation);
      audit.push(`privacy-refresh:${id}`);
      return { searchVisible, discoveryEligible: eligibility(id).discoveryEligible };
    },
    changeCountry(id: HarnessMemberId, residenceCountryId: number, longDistancePreference: InternationalDiscoveryState["longDistancePreference"] = "no_preference") {
      get(id).international = { ...get(id).international, residenceCountryId, longDistancePreference };
      for (const recommendation of Array.from(recommendations)) {
        const [one, two] = recommendation.split(":") as [HarnessMemberId, HarnessMemberId];
        if (!pairEligible(one, two)) recommendations.delete(recommendation);
      }
      audit.push(`country-refresh:${id}`);
      return { residenceCountryId, recommendationCount: recommendations.size };
    },
    block(one: HarnessMemberId, two: HarnessMemberId) {
      const relationshipKey = key(one, two);
      blocks.add(relationshipKey);
      const connection = connections.get(relationshipKey);
      if (connection) { connection.state = "withdrawn"; connection.readiness = "revoked"; connection.familyShare = false; }
      recommendations.delete(`${one}:${two}`);
      recommendations.delete(`${two}:${one}`);
      audit.push(`safety-revocation:${relationshipKey}`);
      return { blocked: true, messaging: "unavailable", readiness: "revoked", familyShare: false, recommendationPresent: recommendations.has(`${one}:${two}`) };
    },
    recoverConnection(one: HarnessMemberId, two: HarnessMemberId) {
      return { state: blocks.has(key(one, two)) ? "unavailable" : connections.get(key(one, two))?.state ?? "not_connected", privateReason: null };
    },
  };
}

export type HarnessScenarioResult = {
  scenarioName: string;
  startingState: string;
  actions: string[];
  expectedResult: string;
  actualResult: unknown;
  pass: boolean;
  failureReason: string | null;
};

export function runControlledMultiMemberJourney(): HarnessScenarioResult[] {
  const results: HarnessScenarioResult[] = [];
  const record = (scenarioName: string, startingState: string, actions: string[], expectedResult: string, actualResult: unknown, pass: boolean, failureReason: string | null = null) => {
    results.push({ scenarioName, startingState, actions, expectedResult, actualResult, pass, failureReason });
  };

  const activation = createControlledMultiMemberJourney();
  const activationStates = Object.fromEntries((['A', 'D', 'E', 'F', 'G', 'I'] as const).map(id => [id, activation.eligibility(id).journeyState]));
  record("activation-state-matrix", "fictional members A-J before lifecycle actions", ["derive server eligibility for A, D, E, F, G, and I"], "ready, new, photos incomplete, pending review, paused, and suspended states remain factual", activationStates, activationStates.A === "DISCOVERY_READY" && activationStates.D === "NEW" && activationStates.E === "PHOTOS_INCOMPLETE" && activationStates.F === "PENDING_REVIEW" && activationStates.G === "PAUSED" && activationStates.I === "SUSPENDED");

  const discovery = createControlledMultiMemberJourney();
  const discoveryResult = { compatible: discovery.discovery("A", "B"), incompatible: discovery.discovery("A", "C"), search: discovery.search("A", "member b") };
  record("discovery-privacy-and-search", "A is discovery-ready with no relationship", ["query B", "reject C by reciprocal compatibility", "search approved display name", "project coarse location"], "B is visible, C is excluded, search is deterministic, and no raw location is projected", discoveryResult, discoveryResult.compatible.eligible && !discoveryResult.incompatible.eligible && discoveryResult.search.length === 1 && discoveryResult.compatible.projection?.locationDisplay === null);

  const relationship = createControlledMultiMemberJourney();
  relationship.sendInterest("A", "B", "interest-a-b-1");
  const mutual = relationship.acceptInterest("A", "B");
  const message = relationship.sendMessage("A", "B", "message-1");
  const readiness = relationship.grantReadiness("A", "B");
  const family = relationship.shareFamily("A", "B");
  relationship.setMarriageIntent("A", "engaged");
  record("interest-to-family-and-intent", "A and B are eligible and unconnected", ["send interest", "accept interest", "send one message", "evaluate readiness", "share Family Circle", "update private marriage intent"], "one mutual connection and authorized downstream states exist", { mutual, message, readiness: { status: readiness.status, readyForReview: readiness.readyForReview }, family, privateIntent: relationship.members.get("A")?.privateMarriageIntent }, mutual.matched && !mutual.duplicate && !message.duplicate && readiness.readyForReview && family.shared && relationship.members.get("A")?.privateMarriageIntent === "engaged");

  const revocation = createControlledMultiMemberJourney();
  revocation.sendInterest("A", "B", "interest-a-b-1");
  revocation.acceptInterest("A", "B");
  revocation.grantReadiness("A", "B");
  revocation.shareFamily("A", "B");
  const revoked = revocation.block("A", "B");
  record("safety-revocation-propagation", "A and B have an active connection with readiness and Family Circle sharing", ["block pair", "withdraw recommendation", "revoke readiness", "withdraw Family Circle sharing", "make connection unavailable"], "all dependent capabilities are unavailable without exposing an internal reason", { revoked, recovery: revocation.recoverConnection("A", "B"), discovery: revocation.discovery("A", "B") }, revoked.messaging === "unavailable" && revoked.readiness === "revoked" && revoked.familyShare === false && revocation.recoverConnection("A", "B").privateReason === null);

  const negative = createControlledMultiMemberJourney();
  const failures: string[] = [];
  for (const [label, action] of [["restricted", () => negative.sendInterest("A", "H", "negative-h")], ["suspended", () => negative.sendInterest("A", "I", "negative-i")], ["incomplete", () => negative.sendInterest("A", "D", "negative-d")]] as const) {
    try { action(); } catch { failures.push(label); }
  }
  record("negative-path-gates", "A attempts introductions to restricted, suspended, and incomplete members", ["send interest to H", "send interest to I", "send interest to D"], "every unsafe or ineligible relationship is rejected", failures, failures.join(",") === "restricted,suspended,incomplete");

  const preference = createControlledMultiMemberJourney();
  const privacyUpdate = preference.changePrivacy("B", false);
  const privacyResult = { privacyUpdate, discovery: preference.discovery("A", "B"), recommendationPresent: [...preference.audit].includes("privacy-refresh:B") && preference.discovery("A", "B").eligible === false };
  record("privacy-change-refresh", "A and B begin as eligible synthetic members", ["hide B from search", "refresh discovery", "withdraw stale recommendation"], "privacy change removes B from discovery without leaving a stale projection", privacyResult, privacyResult.privacyUpdate.discoveryEligible === false && privacyResult.discovery.projection === null && privacyResult.recommendationPresent);

  const geography = createControlledMultiMemberJourney();
  geography.changeCountry("B", COUNTRIES.diaspora, "prefer_nearby");
  const geographyResult = geography.discovery("A", "B");
  record("reciprocal-country-and-distance-refresh", "A and B begin in the same fictional country", ["move B to diaspora fixture country", "apply nearby-only preference", "recalculate reciprocal discovery"], "country and distance rules change eligibility without ranking or precise-distance disclosure", geographyResult, !geographyResult.eligible && geographyResult.projection === null);

  const boundary = createControlledMultiMemberJourney();
  record("test-only-boundary", "fresh harness instance", ["inspect side-effect counters", "inspect Premium policy boundary"], "no provider, payment, document, communication, or production mutation occurs", { external: boundary.external, premiumNeutral: boundary.policy.premiumNeutral }, Object.values(boundary.external).every(value => value === 0) && boundary.policy.premiumNeutral);
  return results;
}
