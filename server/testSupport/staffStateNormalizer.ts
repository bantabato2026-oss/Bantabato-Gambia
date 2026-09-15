import { roleCan, type PermissionKey } from "../domain/adminOperationsPolicy";
import type { SeededStaff } from "./testDatabaseAdapter";

export type NormalizedStaffState = {
  fixture: string;
  staffRole: string;
  status: string;
  permissions: string[];
  sessionUsable: boolean;
};

export type StaffComparison = {
  scenarioId: string;
  fixture: string;
  expectedState: NormalizedStaffState;
  inMemoryState: NormalizedStaffState;
  databaseState: NormalizedStaffState;
  comparison: "match" | "diverged";
};

export function normalizeInMemoryStaffState(staff: SeededStaff, permissions: readonly PermissionKey[], sessionUsable: boolean): NormalizedStaffState {
  return { fixture: staff.id, staffRole: staff.staffRole, status: "active", permissions: [...permissions].sort(), sessionUsable };
}

export function expectedStaffState(staff: SeededStaff, permissions: readonly PermissionKey[]): NormalizedStaffState {
  return normalizeInMemoryStaffState(staff, permissions, true);
}

export function compareStaffStates(staff: SeededStaff, expectedState: NormalizedStaffState, inMemoryState: NormalizedStaffState, databaseState: NormalizedStaffState): StaffComparison {
  const matches = JSON.stringify(expectedState) === JSON.stringify(inMemoryState) && JSON.stringify(expectedState) === JSON.stringify(databaseState);
  return { scenarioId: `staff-state-${staff.id.toLowerCase()}`, fixture: staff.id, expectedState, inMemoryState, databaseState, comparison: matches ? "match" : "diverged" };
}

export function expectedRolePermissions(staff: SeededStaff, candidates: readonly PermissionKey[]): PermissionKey[] {
  return candidates.filter(permission => roleCan(staff.staffRole, permission));
}
