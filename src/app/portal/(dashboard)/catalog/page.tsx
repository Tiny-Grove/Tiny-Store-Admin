import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/supabase/types";
import { formatMoney } from "@/lib/format";

export default async function CatalogPage() {
  const customer = await getPortalCustomer();
  if (!customer) redirect("/portal/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Product[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Product catalog
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Products you sell through Tiny Store.
          </p>
        </div>
        <Link
          href="/portal/catalog/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
        >
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500">No products yet.</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/portal/catalog/${p.id}`}
              className="flex items-center gap-4 px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt=""
                  className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                  No image
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-slate-900">{p.name}</p>
                {p.description && (
                  <p className="truncate text-slate-500">{p.description}</p>
                )}
              </div>
              <p className="font-medium text-slate-900">
                {formatMoney(p.price_cents)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
