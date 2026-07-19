import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/supabase/types";

// The customer record for whoever is signed in to the portal right now, or
// null if there's no session or no linked customer row. Server Actions use
// this — never a client-supplied customer id — to decide which customer's
// data a write is allowed to touch.
export async function getPortalCustomer(): Promise<Customer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (customer as Customer) ?? null;
}
