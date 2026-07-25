"use client";

import { useState } from "react";
import type { Product } from "@/lib/supabase/types";
import { deleteProduct, updateProduct } from "./actions";

const PAGE_SIZE = 5;

export function InventoryList({
  customerId,
  products,
}: {
  customerId: string;
  products: Product[];
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = products.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  if (products.length === 0) {
    return <p className="text-sm text-slate-500">No products yet.</p>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs font-medium tracking-wide text-slate-400 uppercase sm:flex">
        <span className="w-12 shrink-0" />
        <span className="flex-1">Name</span>
        <span className="flex-2">Description</span>
        <span className="w-24">Price</span>
        <span className="w-20">Stock</span>
        <span className="w-16" />
      </div>
      <div className="divide-y divide-slate-100">
        {pageItems.map((product) => (
          <div key={product.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400">
                None
              </div>
            )}

            <form action={updateProduct} className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="productId" value={product.id} />
              <input
                name="name"
                defaultValue={product.name}
                required
                className="min-w-30 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
              <input
                name="description"
                defaultValue={product.description ?? ""}
                placeholder="Description"
                className="min-w-35 flex-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(product.price_cents / 100).toFixed(2)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
              <input
                name="stock_count"
                type="number"
                min="0"
                defaultValue={product.stock_count}
                title="Stock"
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Save
              </button>
            </form>

            <form action={deleteProduct}>
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="productId" value={product.id} />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
          <span className="text-slate-500">
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage >= pageCount - 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
