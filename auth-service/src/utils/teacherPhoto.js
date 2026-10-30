// Teacher photos uploaded through the app are stored as base64 data URLs. Sending those inline in
// teacher lists made every list response ~200 kB heavier, so lists carry a short URL instead and the
// image itself is served (and cached by browsers) from GET /profiles/teachers/:id/photo.

const DATA_URL = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/;

// A short fingerprint of the photo so the URL changes (and caches refresh) when the photo changes
const fingerprint = (dataUrl) => `${dataUrl.length.toString(36)}${dataUrl.slice(-12).replace(/[^A-Za-z0-9]/g, "")}`;

export const publicPhotoUrl = (teacherKey, photoUrl) => {
  if (!photoUrl || !photoUrl.startsWith("data:")) return photoUrl;
  return `/api/profiles/teachers/${encodeURIComponent(teacherKey)}/photo?v=${fingerprint(photoUrl)}`;
};

export const withPublicPhoto = (teacher, teacherKey = teacher.id) =>
  teacher ? { ...teacher, photoUrl: publicPhotoUrl(teacherKey, teacher.photoUrl) } : teacher;

export const decodePhotoDataUrl = (photoUrl) => {
  const match = typeof photoUrl === "string" ? photoUrl.match(DATA_URL) : null;
  if (!match) return null;
  return { contentType: match[1], body: Buffer.from(match[2], "base64") };
};
