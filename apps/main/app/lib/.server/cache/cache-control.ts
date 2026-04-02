export const noStorePrivateCacheControl =
  "no-store, private, max-age=0, must-revalidate";

export const privateImmutableOneYearCacheControl =
  "private, max-age=31536000, immutable";

export const buildPublicMaxAgeCacheControl = (maxAgeSeconds: number): string =>
  `public, max-age=${Math.max(0, Math.floor(maxAgeSeconds))}`;
