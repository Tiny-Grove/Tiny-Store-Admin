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
};

function formatPrice(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
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
  about,
  whatsapp,
  instagramUrl,
  facebookUrl,
  websiteUrl,
  products,
}: {
  slug: string;
  merchantName: string;
  logoUrl: string | null;
  slogan: string | null;
  about: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  products: StorefrontProduct[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
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
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

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

  return (
    <>
      <header
        className="sticky top-0 z-10 shadow-sm"
        style={{ backgroundColor: "var(--brand-secondary)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
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
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
                {merchantName}
              </h1>
              {slogan && (
                <p className="truncate text-xs text-white/70 sm:text-sm">
                  {slogan}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-white/60"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="m17 17-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="w-32 rounded-full border border-white/10 bg-white/10 py-2 pr-3 pl-8 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:w-40 focus:bg-white/20 focus:ring-2 focus:ring-white/30 sm:w-48 sm:focus:w-56"
              />
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {(about || whatsapp || instagramUrl || facebookUrl || websiteUrl) && (
          <div className="mb-6">
            {about && (
              <p className="max-w-2xl text-sm text-slate-600">{about}</p>
            )}
            {(whatsapp || instagramUrl || facebookUrl || websiteUrl) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {whatsapp && (
                  <a
                    href={whatsappLink(whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <path
                        d="M10 3a7 7 0 0 0-6 10.6L3 17l3.5-1a7 7 0 1 0 3.5-13Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.3 8.3c.2 1.7 2.2 3.7 3.9 3.9.8.1 1-.5 1-1"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    WhatsApp
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" />
                    </svg>
                    Instagram
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
                      <path
                        d="M11.5 7.5h-1a1 1 0 0 0-1 1V10H8v1.5h1.5V16H11v-4.5h1.3l.2-1.5H11V8.7c0-.3.2-.5.5-.5h1V6.7a10 10 0 0 0-1-.2Z"
                        fill="currentColor"
                      />
                    </svg>
                    Facebook
                  </a>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
                      <path
                        d="M3 10h14M10 3c1.8 2 2.8 4.5 2.8 7s-1 5-2.8 7c-1.8-2-2.8-4.5-2.8-7s1-5 2.8-7Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {filteredProducts.length === 0 ? (
          <p className="text-sm text-slate-500">
            {query
              ? "No products match your search."
              : "No products available right now — check back soon."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const quantity = cart[product.id] ?? 0;
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="mb-3 aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                      No image
                    </div>
                  )}
                  <p className="truncate text-sm font-medium text-slate-900">
                    {product.name}
                  </p>
                  {product.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {product.description}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-(--brand-primary)">
                    {formatPrice(product.priceCents, product.currency)}
                  </p>

                  {quantity === 0 ? (
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, 1)}
                      className="mt-2 w-full rounded-lg bg-(--brand-primary) px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Add to cart
                    </button>
                  ) : (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200">
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
                        className="px-3 py-1.5 text-slate-600"
                        aria-label={`Add one ${product.name}`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
