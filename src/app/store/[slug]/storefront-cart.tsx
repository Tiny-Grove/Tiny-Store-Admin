"use client";

import { useState, useTransition } from "react";
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

export default function StorefrontCart({
  slug,
  products,
}: {
  slug: string;
  products: StorefrontProduct[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
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

  const handleCheckout = () => {
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
    <div className={itemCount > 0 ? "pb-28" : ""}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {products.map((product) => {
          const quantity = cart[product.id] ?? 0;
          return (
            <div
              key={product.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
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
              <p className="mt-1 text-sm font-semibold text-[var(--brand-primary)]">
                {formatPrice(product.priceCents, product.currency)}
              </p>

              {quantity === 0 ? (
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, 1)}
                  className="mt-2 w-full rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
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

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-2">
            <div>
              <p className="text-sm text-slate-500">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatPrice(totalCents, currency)}
              </p>
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPending}
              className="rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Redirecting…" : "Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
