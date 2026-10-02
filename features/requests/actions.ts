"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { DEFAULT_CURRENCY, isCurrency, parseAmount } from "@/lib/money";
import { formatMoney } from "@/lib/format";
import { MAX_FILES, MAX_TOTAL_BYTES, isAllowedFile, safeFilename } from "@/lib/attachment-rules";
import type { FormState } from "@/lib/db/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The request row, its "create" audit entry, requester name/email and status are all set by the
// database (insert triggers). The app only sends the fields below.
export async function createRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const clientId = str(fd, "request_id");
  const values = {
    request_id: UUID_RE.test(clientId) ? clientId : crypto.randomUUID(),
    title: str(fd, "title"),
    description: str(fd, "description"),
    amount: str(fd, "amount"),
    currency: str(fd, "currency") || DEFAULT_CURRENCY,
    amount_myr: str(fd, "amount_myr"),
    category: str(fd, "category"),
    vendor: str(fd, "vendor"),
    routine: fd.get("routine") ? "on" : "",
  };
  const id = values.request_id;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = await getDb();
  const settings = await getSettings();
  const fieldErrors: Record<string, string> = {};

  if (!values.title) fieldErrors.title = "Enter a short title, for example 'Laptop for new hire'.";
  else if (values.title.length > 200) fieldErrors.title = "Keep the title under 200 characters.";
  if (!values.description) fieldErrors.description = "Describe what is needed and why.";
  else if (values.description.length > 4000) fieldErrors.description = "Keep the description under 4,000 characters.";
  if (values.vendor.length > 200) fieldErrors.vendor = "Keep the vendor name under 200 characters.";
  if (values.category.length > 100) fieldErrors.category = "Choose one of the listed categories.";
  if (!isCurrency(values.currency)) fieldErrors.currency = "Choose a currency from the list.";

  const parsed = parseAmount(values.amount);
  if (!parsed.ok) fieldErrors.amount = parsed.error;

  let amountMyr: number | null = null;
  if (parsed.ok && isCurrency(values.currency)) {
    if (values.currency === "MYR") amountMyr = parsed.value;
    else {
      const m = parseAmount(values.amount_myr);
      if (m.ok) amountMyr = m.value;
      else fieldErrors.amount_myr = values.amount_myr ? m.error : "Enter the approximate amount in MYR.";
    }
  }

  if (values.category && !fieldErrors.category) {
    const { data: cat, error: catErr } = await db.from("categories").select("id").eq("name", values.category).maybeSingle();
    if (catErr) return { error: "Could not check the category. Please try again.", values };
    if (!cat) fieldErrors.category = "That category no longer exists. Choose another one.";
  }

  // Attachments
  const files = fd.getAll("attachments").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const total = files.reduce((t, f) => t + f.size, 0);
  if (files.length > MAX_FILES) fieldErrors.attachments = `Attach at most ${MAX_FILES} files.`;
  else if (total > MAX_TOTAL_BYTES) fieldErrors.attachments = "The files are larger than 4 MB in total. Attach smaller files.";
  else if (files.some((f) => !isAllowedFile(f))) fieldErrors.attachments = "Only PDF, JPG, PNG or WebP files can be attached.";
  else if (amountMyr !== null && amountMyr >= settings.attachmentRequiredOverMyr && files.length === 0)
    fieldErrors.attachments = `Attach a quotation or invoice. It is required for requests of ${formatMoney(settings.attachmentRequiredOverMyr, "MYR")} or more.`;

  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
      values,
      error: files.length ? "Please check the highlighted fields. You will need to attach your files again." : undefined,
    };
  }

  // Idempotency: a double click or retry with the same id must not create a second request.
  const { data: existing } = await db.from("purchase_requests").select("id").eq("id", id).maybeSingle();
  if (existing) redirect(`/requests/${id}?submitted=1`);

  const uploaded: { path: string; file: File }[] = [];
  const cleanup = async () => {
    if (uploaded.length) await db.storage.from("attachments").remove(uploaded.map((u) => u.path)).catch(() => {});
  };

  try {
    for (const file of files) {
      const path = `${user.id}/${id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error } = await db.storage.from("attachments").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("upload");
      uploaded.push({ path, file });
    }
  } catch {
    await cleanup();
    return { error: "Could not upload the attachments. Check your connection and try again.", values };
  }

  const { error: insErr } = await db.from("purchase_requests").insert({
    id,
    title: values.title,
    description: values.description,
    amount: parsed.ok ? parsed.value : 0,
    currency: values.currency,
    amount_myr: amountMyr,
    category: values.category || null,
    vendor: values.vendor || null,
    routine: !!values.routine,
  });
  if (insErr) {
    await cleanup();
    if (insErr.code === "23505") redirect(`/requests/${id}?submitted=1`); // same id already saved
    if (insErr.code === "23514") return { error: "One of the values is not allowed. Check the lengths and amount, then try again.", values };
    return { error: "Could not submit the request. Check your connection and try again.", values };
  }

  let attachmentsFailed = false;
  if (uploaded.length) {
    const { error: attErr } = await db.from("request_attachments").insert(
      uploaded.map((u) => ({
        request_id: id,
        user_id: user.id,
        path: u.path,
        filename: u.file.name.slice(0, 200),
        content_type: u.file.type,
        size_bytes: u.file.size,
      })),
    );
    if (attErr) {
      attachmentsFailed = true;
      await cleanup();
    }
  }

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/audit");
  redirect(`/requests/${id}?submitted=1${attachmentsFailed ? "&attachments=failed" : ""}`);
}
