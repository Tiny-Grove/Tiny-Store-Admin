"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setPlanEnabled(priceId: string, enabled: boolean) {
  const admin = createAdminClient();
  await admin
    .from("stripe_plan_settings")
    .upsert({ stripe_price_id: priceId, enabled, updated_at: new Date().toISOString() });

  revalidatePath("/subscriptions");
}
