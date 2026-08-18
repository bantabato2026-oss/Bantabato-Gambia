export const MAX_PROFILE_PHOTOS = 5;

export function assertProfilePhotoCapacity(photoCount: number) {
  if (photoCount >= MAX_PROFILE_PHOTOS) throw new Error(`You can add up to ${MAX_PROFILE_PHOTOS} profile photos.`);
}
