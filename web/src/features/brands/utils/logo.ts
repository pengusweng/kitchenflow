// Mirrors the brands API upload rules: JPG or PNG, at most 5 MiB.
export const LOGO_ACCEPT = "image/png,image/jpeg";
const LOGO_TYPES = new Set(LOGO_ACCEPT.split(","));
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export type SelectedLogo = { file: File; previewUrl: string };

/** Why a file can't be used as a logo (or, with `noun`, another kind of image), or null when it can. */
export function logoProblem(file: File, noun = "Logos"): string | null {
  if (!LOGO_TYPES.has(file.type)) return "Choose a JPG or PNG image.";
  if (file.size > MAX_LOGO_BYTES) return `That image is ${formatBytes(file.size)}. ${noun} can be up to 5 MB.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
