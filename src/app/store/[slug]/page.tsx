import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Product } from "@/lib/supabase/types";
import StorefrontCart from "./storefront-cart";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: customerData } = await admin
    .from("customers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const merchant = customerData as Customer | null;
  if (!merchant || !merchant.stripe_connect_charges_enabled) {
    notFound();
  }

  const { data: productsData } = await admin
    .from("products")
    .select("*")
    .eq("customer_id", merchant.id)
    .gt("stock_count", 0)
    .order("created_at", { ascending: false });

  const products = (productsData ?? []) as Product[];
  const primary = merchant.primary_color || "#4f46e5";
  const secondary = merchant.secondary_color || "#0f172a";

  return (
    <div
      style={
        {
          "--brand-primary": primary,
          "--brand-secondary": secondary,
        } as React.CSSProperties
      }
      className="flex min-h-screen flex-col bg-slate-50"
    >
      <StorefrontCart
        slug={slug}
        merchantName={merchant.company ?? "Store"}
        logoUrl={merchant.logo_url}
        slogan={merchant.slogan}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.price_cents,
          currency: p.currency,
          imageUrl: p.image_url,
          stockCount: p.stock_count,
        }))}
      />

      <footer className="border-t border-slate-200 py-6">
        <p className="text-center text-xs text-slate-400">
          Powered by Tiny Store
        </p>
      </footer>
    </div>
  );
}
