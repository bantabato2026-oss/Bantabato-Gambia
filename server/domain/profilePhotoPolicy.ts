export const MAX_PROFILE_PHOTOS = 5;
export const MIN_APPROVED_PROFILE_PHOTOS = 5;
export function assertProfilePhotoCapacity(photoCount: number) {
  if (photoCount >= MAX_PROFILE_PHOTOS) throw new Error(`You can add up to ${MAX_PROFILE_PHOTOS} profile photos.`);
}

export function approvedPhotoProgress(approvedPhotoCount: number) {
  const approved = Math.max(0, Math.min(MAX_PROFILE_PHOTOS, approvedPhotoCount));
  return { approved, required: MIN_APPROVED_PROFILE_PHOTOS, complete: approved >= MIN_APPROVED_PROFILE_PHOTOS, remaining: Math.max(0, MIN_APPROVED_PROFILE_PHOTOS - approved) };
}
