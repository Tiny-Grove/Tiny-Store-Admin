import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUSPEND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// Runs daily (see vercel.json) — suspends any account whose platform
// subscription payment has been failing for 7+ days (set by the
// invoice.payment_failed handler in /api/webhooks/stripe) and isn't
// already suspended. Reactivation is always a manual admin/staff action
// (see reactivateAccount in customers/[id]/actions.ts) — this route only
// ever suspends, never reactivates.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - SUSPEND_AFTER_MS).toISOString();

  const { data: overdue, error } = await admin
    .from("customers")
    .select("id")
    .lte("payment_failed_at", cutoff)
    .neq("account_status", "suspended")
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ suspended: 0 });
  }

  const ids = overdue.map((c) => c.id);
  await admin
    .from("customers")
    .update({ account_status: "suspended", updated_at: new Date().toISOString() })
    .in("id", ids);

  return NextResponse.json({ suspended: ids.length, ids });
}
