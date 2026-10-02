"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/db/types";

// Same neutral reply whether or not the address belongs to an account.
const NEUTRAL = "If an account exists for that email, we have sent a link to reset your password.";

export async function requestReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    return { fieldErrors: { email: "Enter a valid email address." }, values: { email } };

  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset`,
    });
  } catch {
    // Deliberately swallowed: never reveal whether the email exists or whether sending failed.
  }
  return { values: { email }, fieldErrors: { notice: NEUTRAL } };
}
