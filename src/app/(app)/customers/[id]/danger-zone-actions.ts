"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// Soft delete — hidden from the customer list and its public storefront,
// but every related row is left untouched and fully restorable.
export async function archiveCustomer(formData: FormData) {
  if (!(await requireAdmin())) return;

  const customerId = formData.get("customerId") as string;
  if (!customerId) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/");
}

export async function restoreCustomer(formData: FormData) {
  if (!(await requireAdmin())) return;

  const customerId = formData.get("customerId") as string;
  if (!customerId) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ deleted_at: null })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/");
}

export interface HardDeleteState {
  error?: string;
}

// Permanently removes a customer and everything that belongs to them.
// Postgres cascades handle every customer-owned table (subscriptions,
// notes, products, product_categories, orders, end_customers, support
// tickets, subscription_events — see supabase/migrations for the
// ON DELETE CASCADE chain); this action's job is cleaning up the state
// Postgres doesn't know about: Stripe, Supabase Storage, and Supabase Auth.
export async function hardDeleteCustomer(
  _prevState: HardDeleteState | null,
  formData: FormData
): Promise<HardDeleteState> {
  if (!(await requireAdmin())) {
    return { error: "You don't have permission to do this." };
  }

  const customerId = formData.get("customerId") as string;
  const confirmEmail = (formData.get("confirmEmail") as string)?.trim().toLowerCase();
  if (!customerId) return { error: "Missing customer." };

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id, email, auth_user_id, stripe_customer_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) return { error: "Customer not found." };
  if (!confirmEmail || confirmEmail !== customer.email.toLowerCase()) {
    return { error: "Email doesn't match — nothing was deleted." };
  }

  // 1. Cancel any live Stripe subscriptions so deleting the CRM record
  // doesn't leave the merchant being billed for a plan nobody can see or
  // manage anymore. The Stripe Customer and Connect account objects
  // themselves are deliberately left alone — those are financial records
  // outside this app's ownership, not "related information" in our DB.
  if (isStripeConfigured() && customer.stripe_customer_id) {
    const stripe = getStripe();
    const { data: subs } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("customer_id", customerId);

    for (const sub of subs ?? []) {
      if (!sub.stripe_subscription_id || sub.status === "canceled") continue;
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch {
        // Already canceled / gone on Stripe's side — fine, keep going.
      }
    }
  }

  // 2. Delete uploaded storage objects. Two path conventions exist: the
  // admin app's own logo/favicon uploads (keyed by customerId — see
  // src/lib/customer-assets.ts), and the mobile app's self-service logo
  // and product-image uploads (keyed by auth_user_id — see the storage
  // policies in 20260720100000_setup_wizard_grants.sql and
  // 20260720130000_inventory_products_categories.sql).
  const bucket = admin.storage.from("customer-assets");
  const prefixes = [customerId];
  if (customer.auth_user_id) {
    prefixes.push(`logos/${customer.auth_user_id}`, `products/${customer.auth_user_id}`);
  }
  for (const prefix of prefixes) {
    const { data: files } = await bucket.list(prefix);
    if (files && files.length > 0) {
      await bucket.remove(files.map((f) => `${prefix}/${f.name}`));
    }
  }

  // 3. Delete their mobile app login.
  if (customer.auth_user_id) {
    await admin.auth.admin.deleteUser(customer.auth_user_id).catch(() => {});
  }

  // 4. Delete the row itself — cascades take care of the rest.
  const { error } = await admin.from("customers").delete().eq("id", customerId);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath("/");
  redirect("/customers");
}
