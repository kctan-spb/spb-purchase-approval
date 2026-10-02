import { getDb } from "@/lib/db/client";
import type { Attachment } from "@/lib/db/types";

export type AttachmentLink = Attachment & { url: string | null };

/** Attachments of a request with short-lived (300 s) signed download links, using the viewer's own session. */
export async function listAttachments(requestId: string): Promise<AttachmentLink[]> {
  const db = await getDb();
  const { data, error } = await db
    .from("request_attachments")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Attachment[];
  if (rows.length === 0) return [];
  const { data: signed } = await db.storage.from("attachments").createSignedUrls(
    rows.map((r) => r.path),
    300,
  );
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  return rows.map((r) => ({ ...r, size_bytes: Number(r.size_bytes), url: urlByPath.get(r.path) ?? null }));
}
