/** Tam yüz görselleri — giriş animasyonunda rastgele biri seçilir */
export const AVATAR_FACE_VARIANTS = [
  "/Avatar_Set/face/face.png",
  "/Avatar_Set/face/face2.png",
  "/Avatar_Set/face/face3.png",
  "/Avatar_Set/face/face4.png",
  "/Avatar_Set/face/face5.png",
  "/Avatar_Set/face/face6.png",
  "/Avatar_Set/face/face7.png",
  "/Avatar_Set/face/face8.png",
  "/Avatar_Set/face/face9.png",
  "/Avatar_Set/face/face10.png",
  "/Avatar_Set/face/face11.png",
  "/Avatar_Set/face/face12.png",
  "/Avatar_Set/face/face13.png",
  "/Avatar_Set/face/face14.png",
  "/Avatar_Set/face/face15.png",
  "/Avatar_Set/face/face16.png",
] as const;

export const DEFAULT_AVATAR_FACE = AVATAR_FACE_VARIANTS[0];

export function pickRandomAvatarFace(): string {
  const index = Math.floor(Math.random() * AVATAR_FACE_VARIANTS.length);
  return AVATAR_FACE_VARIANTS[index] ?? DEFAULT_AVATAR_FACE;
}
