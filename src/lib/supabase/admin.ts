import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Privileged client using the service role key — bypasses Row Level Security.
// Only ever import this from Server Components / Route Handlers / Server Actions.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
