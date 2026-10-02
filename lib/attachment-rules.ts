// Shared (client + server) attachment limits.
export const MAX_FILES = 3;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to ~4.5 MB
export const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** True when both the declared type and the file extension are allowed and agree. */
export function isAllowedFile(f: { name: string; type: string }): boolean {
  const exts = ALLOWED_TYPES[f.type];
  return !!exts && exts.includes(extensionOf(f.name));
}

/** Filename safe to embed in a storage path. */
export function safeFilename(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "");
  return (cleaned || "file").slice(-100);
}
