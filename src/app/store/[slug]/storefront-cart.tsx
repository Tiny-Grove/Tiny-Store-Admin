"use client";

import { useMemo, useState, useTransition } from "react";
import { createStorefrontCheckout } from "./checkout-action";

type StorefrontProduct = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stockCount: number;
  isFeatured: boolean;
  category: string | null;
};

type SortMode = "featured" | "price-low" | "price-high" | "name";

const PER_PAGE = 12;

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

// Matches the mobile app's own convention (whatsappCustomer in
// CustomerListScreen.tsx) — strip everything but digits, then wa.me.
function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

export default function StorefrontCart({
  slug,
  merchantName,
  logoUrl,
  slogan,
  bannerUrl,
  about,
  whatsapp,
  instagramUrl,
  facebookUrl,
  websiteUrl,
  categories,
  products,
}: {
  slug: string;
  merchantName: string;
  logoUrl: string | null;
  slogan: string | null;
  bannerUrl: string | null;
  about: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  categories: string[];
  products: StorefrontProduct[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortMode>("featured");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }
      return next;
    });
  };

  const entries = Object.entries(cart);
  const itemCount = entries.reduce((sum, [, qty]) => sum + qty, 0);
  const totalCents = entries.reduce((sum, [productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    return sum + (product ? product.priceCents * qty : 0);
  }, 0);
  const currency = products[0]?.currency ?? "gbp";

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        p.name.toLowerCase().includes(q)
    );
    if (sort === "price-low") result = [...result].sort((a, b) => a.priceCents - b.priceCents);
    if (sort === "price-high") result = [...result].sort((a, b) => b.priceCents - a.priceCents);
    if (sort === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, query, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const updateCategory = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const updateSort = (value: SortMode) => {
    setSort(value);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setPage(1);
  };

  const handleCheckout = () => {
    if (itemCount === 0 || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await createStorefrontCheckout(
        slug,
        entries.map(([productId, quantity]) => ({ productId, quantity }))
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) window.location.href = result.url;
    });
  };

  const socialLinks = [
    whatsapp && { key: "whatsapp", href: whatsappLink(whatsapp), label: "WhatsApp" },
    instagramUrl && { key: "instagram", href: instagramUrl, label: "Instagram" },
    facebookUrl && { key: "facebook", href: facebookUrl, label: "Facebook" },
    websiteUrl && { key: "website", href: websiteUrl, label: "Website" },
  ].filter((link): link is { key: string; href: string; label: string } => Boolean(link));

  return (
    <>
      <header
        className="sticky top-0 z-10 shadow-sm backdrop-blur"
        style={{ backgroundColor: "color-mix(in srgb, var(--brand-secondary) 92%, transparent)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={merchantName}
                className="h-10 w-10 shrink-0 rounded-lg border border-white/20 bg-white object-contain p-1"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                {merchantName.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
              {merchantName}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={itemCount === 0 || isPending}
            className="relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
              <path
                d="M3 4h1.5l1.3 8.4a1.5 1.5 0 0 0 1.48 1.27h6.24a1.5 1.5 0 0 0 1.48-1.24L16.5 6.5H5.2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="17" r="1.15" fill="currentColor" />
              <circle cx="14.5" cy="17" r="1.15" fill="currentColor" />
            </svg>
            <span className="hidden sm:inline">
              {isPending
                ? "Redirecting…"
                : itemCount > 0
                  ? formatPrice(totalCents, currency)
                  : "Checkout"}
            </span>
            {itemCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold"
                style={{ color: "var(--brand-secondary)" }}
              >
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <section
        className="relative flex min-h-65 items-end overflow-hidden sm:min-h-100 lg:min-h-115"
        style={
          bannerUrl
            ? undefined
            : { background: "linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))" }
        }
      >
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 sm:pb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {merchantName}
          </h2>
          {slogan && (
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">{slogan}</p>
          )}
          {products.length > 0 && (
            <a
              href="#products"
              className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Shop now
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d="m5 8 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div id="products" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">All Products</h2>
          <p className="mt-1 text-sm text-slate-500">
            {products.length} product{products.length === 1 ? "" : "s"} available
          </p>
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {products.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <label className="relative flex min-w-50 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="m17 17-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="min-h-11 w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            {categories.length > 0 && (
              <select
                value={category}
                onChange={(e) => updateCategory(e.target.value)}
                aria-label="Filter by category"
                className="min-h-11 min-w-37.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value as SortMode)}
              aria-label="Sort products"
              className="min-h-11 min-w-37.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              {products.length === 0
                ? "No products available right now — check back soon."
                : "No products match your filters."}
            </p>
            {products.length > 0 && (query || category !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-medium text-(--brand-primary) hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleProducts.map((product) => {
                const quantity = cart[product.id] ?? 0;
                const atStockLimit = quantity >= product.stockCount;
                return (
                  <div
                    key={product.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-square w-full bg-slate-50">
                      {product.isFeatured && (
                        <span
                          className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold"
                          style={{ color: "var(--brand-secondary)" }}
                        >
                          Featured
                        </span>
                      )}
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-1 p-3">
                      {product.category && (
                        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                          {product.category}
                        </p>
                      )}
                      <p className="truncate text-sm font-medium text-slate-900">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="line-clamp-2 text-xs text-slate-500">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <p className="text-sm font-semibold text-(--brand-primary)">
                          {formatPrice(product.priceCents, product.currency)}
                        </p>
                      </div>

                      {quantity === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, 1)}
                          className="mt-1 w-full rounded-lg bg-(--brand-primary) px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                          Add to cart
                        </button>
                      ) : (
                        <div className="mt-1">
                          <div className="flex items-center justify-between rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="px-3 py-1.5 text-slate-600"
                              aria-label={`Remove one ${product.name}`}
                            >
                              −
                            </button>
                            <span className="text-sm font-medium text-slate-900">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  product.id,
                                  Math.min(quantity + 1, product.stockCount)
                                )
                              }
                              disabled={atStockLimit}
                              className="px-3 py-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label={`Add one ${product.name}`}
                            >
                              +
                            </button>
                          </div>
                          {atStockLimit && (
                            <p className="mt-1 text-center text-[11px] text-slate-400">
                              Max stock reached
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="min-h-10 min-w-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className="min-h-10 min-w-10 rounded-lg border px-2 text-sm font-medium"
                    style={
                      p === currentPage
                        ? {
                            backgroundColor: "var(--brand-secondary)",
                            borderColor: "var(--brand-secondary)",
                            color: "white",
                          }
                        : { borderColor: "#e2e8f0", color: "#475569" }
                    }
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="min-h-10 min-w-10 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mt-auto text-white" style={{ backgroundColor: "var(--brand-secondary)" }}>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={merchantName}
                className="h-11 w-11 shrink-0 rounded-lg border border-white/20 bg-white object-contain p-1"
              />
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                {merchantName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-lg font-semibold">{merchantName}</span>
          </div>

          {about && <p className="mt-4 max-w-xl text-sm text-white/75">{about}</p>}

          {socialLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <div className="mt-8 border-t border-white/15 pt-5 text-center text-xs text-white/50">
            Created with ❤️ by Bizzlet
          </div>
        </div>
      </footer>
    </>
  );
}
