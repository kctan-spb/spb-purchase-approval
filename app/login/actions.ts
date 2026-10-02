"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_DOMAIN_MESSAGE, isAllowedEmail } from "@/lib/email-domain";
import type { FormState } from "@/lib/db/types";

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password.", values: { email } };
  redirect("/");
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const values = { name, email };
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Your name is required.";
  if (!email) fieldErrors.email = "Email is required.";
  else if (!isAllowedEmail(email)) fieldErrors.email = EMAIL_DOMAIN_MESSAGE;
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    // The database trigger rejects other domains; Supabase reports that as a generic database error.
    if (/email_domain_not_allowed|database error saving new user/i.test(error.message))
      return { fieldErrors: { email: EMAIL_DOMAIN_MESSAGE }, values };
    return { error: error.message, values };
  }
  // With email confirmation enabled there is no session yet.
  if (!data.session)
    return { error: undefined, values, fieldErrors: { notice: "Check your email to confirm your account, then sign in." } };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
