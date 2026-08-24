import { createControlledMultiMemberJourney, type HarnessMemberId } from "../controlledMultiMemberJourney";
import { getMemberEligibility, getProfileByUserId } from "../db";
import type { SeededMember } from "./testDatabaseAdapter";

export type NormalizedMemberState = {
  journeyState: string;
  profileComplete: boolean;
  photosComplete: boolean;
  approvedPhotoCount: number;
  discoveryEligible: boolean;
  connectionEligible: boolean;
  profileStatus: string;
  searchVisible: boolean;
};

export type NormalizedComparison = {
  scenarioId: string;
  fixture: HarnessMemberId;
  expectedState: NormalizedMemberState;
  inMemoryState: NormalizedMemberState;
  databaseState: NormalizedMemberState;
  comparison: "match" | "diverged";
};

export function normalizeInMemoryMemberState(memberId: HarnessMemberId): NormalizedMemberState {
  const harness = createControlledMultiMemberJourney();
  const member = harness.members.get(memberId);
  if (!member) throw new Error(`Synthetic member ${memberId} is unavailable`);
  const eligibility = harness.eligibility(memberId);
  return {
    journeyState: eligibility.journeyState,
    profileComplete: eligibility.profileComplete,
    photosComplete: eligibility.photosComplete,
    approvedPhotoCount: eligibility.approvedPhotoCount,
    discoveryEligible: eligibility.discoveryEligible,
    connectionEligible: eligibility.connectionEligible,
    profileStatus: member.profileStatus,
    searchVisible: member.searchVisible,
  };
}

export async function normalizeDatabaseMemberState(member: SeededMember): Promise<NormalizedMemberState> {
  const profile = await getProfileByUserId(member.userId);
  const eligibility = await getMemberEligibility(member.profileId);
  if (!profile) throw new Error(`Synthetic member ${member.id} profile is unavailable`);
  return {
    journeyState: eligibility.journeyState,
    profileComplete: eligibility.profileComplete,
    photosComplete: eligibility.photosComplete,
    approvedPhotoCount: eligibility.approvedPhotoCount,
    discoveryEligible: eligibility.discoveryEligible,
    connectionEligible: eligibility.connectionEligible,
    profileStatus: profile.profileStatus,
    searchVisible: profile.searchVisible,
  };
}

export function compareMemberStates(fixture: HarnessMemberId, expectedState: NormalizedMemberState, inMemoryState: NormalizedMemberState, databaseState: NormalizedMemberState): NormalizedComparison {
  const matches = JSON.stringify(expectedState) === JSON.stringify(inMemoryState) && JSON.stringify(expectedState) === JSON.stringify(databaseState);
  return { scenarioId: `member-state-${fixture.toLowerCase()}`, fixture, expectedState, inMemoryState, databaseState, comparison: matches ? "match" : "diverged" };
}
