import { createClient } from "@/lib/supabase/server";

// Single entry point for all server-side data access (queries + server actions).
export async function getDb() {
  return createClient();
}
