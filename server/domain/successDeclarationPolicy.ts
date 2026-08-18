export type SuccessDeclarationStatus = "private" | "consent_recorded" | "withdrawn";

export function resolveSuccessDeclarationStatus(sharingConsent: boolean): SuccessDeclarationStatus {
  return sharingConsent ? "consent_recorded" : "private";
}

export function canPublishSuccessDeclaration(): false {
  return false;
}
