import { cache } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Product } from "@/lib/supabase/types";
import StorefrontCart from "./storefront-cart";

// Cached per-request so generateMetadata and the page body share one lookup
// instead of querying the customer twice.
const getMerchant = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Customer | null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await getMerchant(slug);
  if (!merchant || merchant.deleted_at) return {};

  return {
    title: merchant.company ?? "Store",
    icons: merchant.favicon_url ? { icon: merchant.favicon_url } : undefined,
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const merchant = await getMerchant(slug);
  return { themeColor: merchant?.primary_color || "#4f46e5" };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const merchant = await getMerchant(slug);
  if (!merchant || !merchant.stripe_connect_charges_enabled || merchant.deleted_at) {
    notFound();
  }

  const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
    admin
      .from("products")
      .select("*")
      .eq("customer_id", merchant.id)
      .gt("stock_count", 0)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }),
    admin
      .from("product_categories")
      .select("id, name")
      .eq("customer_id", merchant.id)
      .order("name"),
  ]);

  const products = (productsData ?? []) as Product[];
  const categories = categoriesData ?? [];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
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
        bannerUrl={merchant.storefront_banner_url}
        about={merchant.storefront_about}
        whatsapp={merchant.storefront_whatsapp}
        instagramUrl={merchant.storefront_instagram_url}
        facebookUrl={merchant.storefront_facebook_url}
        websiteUrl={merchant.storefront_website_url}
        categories={categories.map((c) => c.name)}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.price_cents,
          currency: p.currency,
          imageUrl: p.image_url,
          stockCount: p.stock_count,
          isFeatured: p.is_featured,
          category: p.category_id ? (categoryNameById.get(p.category_id) ?? null) : null,
        }))}
      />
    </div>
  );
}
