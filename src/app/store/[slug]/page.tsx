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
      className="min-h-screen bg-slate-50"
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-6">
          {merchant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={merchant.logo_url}
              alt={merchant.company ?? "Logo"}
              className="h-14 w-14 rounded-lg border border-slate-200 object-contain p-1"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-lg font-semibold text-white">
              {(merchant.company ?? "S").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {merchant.company ?? "Store"}
            </h1>
            <p className="text-sm text-slate-500">Powered by Tiny Store</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {products.length === 0 ? (
          <p className="text-sm text-slate-500">
            No products available right now — check back soon.
          </p>
        ) : (
          <StorefrontCart
            slug={slug}
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
        )}
      </main>
    </div>
  );
}
