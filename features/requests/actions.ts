"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { writeAuditLog } from "@/features/audit/data";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "@/lib/db/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = {
    title: str(fd, "title"),
    description: str(fd, "description"),
    amount: str(fd, "amount"),
    currency: str(fd, "currency") || "USD",
    category: str(fd, "category"),
    vendor: str(fd, "vendor"),
    routine: fd.get("routine") ? "on" : "",
  };

  const fieldErrors: Record<string, string> = {};
  if (!values.title) fieldErrors.title = "Title is required.";
  if (!values.description) fieldErrors.description = "Description is required.";
  const amount = Number(values.amount.replace(/,/g, ""));
  if (!values.amount || !Number.isFinite(amount) || amount <= 0)
    fieldErrors.amount = "Enter an amount greater than 0.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let id: string;
  try {
    const db = await getDb();
    const { data, error } = await db
      .from("purchase_requests")
      .insert({
        user_id: user.id,
        title: values.title,
        description: values.description,
        amount,
        currency: values.currency,
        category: values.category || null,
        vendor: values.vendor || null,
        routine: !!values.routine,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505")
        return { fieldErrors: { title: "A request with this title already exists." }, values };
      throw error;
    }
    id = data.id;
    await writeAuditLog({
      action: "create",
      entity_id: id,
      details: {
        amount,
        currency: values.currency,
        category: values.category || null,
        vendor: values.vendor || null,
        routine: !!values.routine,
        requested_by: user.name,
      },
    });
  } catch {
    return {
      error: "Could not submit request. Check your connection and try again.",
      values,
    };
  }

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/audit");
  redirect(`/requests/${id}`);
}
