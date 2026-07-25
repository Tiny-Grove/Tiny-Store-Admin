import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Defense-in-depth for admin-only server actions. Middleware already gates
// the pages these actions are called from (e.g. /settings) to the "admin"
// role, but actions are independently invocable, so re-check here too.
export async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_users")
    .select("role, active")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  return !!data?.active && data.role === "admin";
}
