export type CommunicationState = "mutual_interest" | "active" | "paused" | "archived" | "blocked" | "reported" | "restricted" | "closed";

export const SENDABLE_CONVERSATION_STATES: CommunicationState[] = ["mutual_interest", "active"];
export const VIEWABLE_CONVERSATION_STATES: CommunicationState[] = ["mutual_interest", "active", "paused", "reported", "restricted"];

export function canSendInConversation(input: { isParticipant: boolean; isBlocked: boolean; state: CommunicationState }) {
  return input.isParticipant && !input.isBlocked && SENDABLE_CONVERSATION_STATES.includes(input.state);
}

export function canViewConversation(input: { isParticipant: boolean; isBlocked: boolean; state: CommunicationState }) {
  return input.isParticipant && !input.isBlocked && VIEWABLE_CONVERSATION_STATES.includes(input.state);
}

export function pageByDescendingId<T extends { id: number }>(items: T[], limit: number) {
  const page = items.slice(0, limit);
  return { items: page, nextCursor: items.length > limit ? page.at(-1)?.id : undefined };
}

export function validateVoiceNoteMeta(input: { mimeType: string; byteLength: number; durationSeconds: number }) {
  const allowed = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];
  if (!allowed.includes(input.mimeType)) return { valid: false as const, reason: "Use a supported compressed audio format" };
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 1 || input.durationSeconds > 180) return { valid: false as const, reason: "Voice notes must be between 1 second and 3 minutes" };
  if (!input.byteLength || input.byteLength > 6 * 1024 * 1024) return { valid: false as const, reason: "Voice note is empty or exceeds the 6 MB limit" };
  return { valid: true as const };
}

/** Prompts are deliberately generic and contain no private values or hidden preference data. */
export function safePromptForDimension(dimension: string) {
  const prompts: Record<string, string> = {
    location: "You may want to discuss where you would ideally build your future home.",
    relocation: "You may want to discuss how you each approach relocation and future home plans.",
    family_involvement: "You may want to discuss what respectful family involvement looks like to each of you.",
    marriage_timeline: "You may want to discuss the pace and preparation you each hope for before marriage.",
    children: "You may want to discuss your hopes and responsibilities around children with care.",
    desired_children: "You may want to discuss your hopes around children and family life.",
    religion: "You may want to discuss the role of faith practice in your household.",
  };
  return prompts[dimension];
}
