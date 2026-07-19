import Link from "next/link";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PortalDashboardPage() {
  const customer = await getPortalCustomer();
  if (!customer) return null;

  const admin = createAdminClient();
  const { count: productCount } = await admin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id);

  const cards = [
    {
      href: "/portal/business",
      title: "Business details",
      description: customer.company ?? "Add your business information",
    },
    {
      href: "/portal/branding",
      title: "Branding",
      description: customer.logo_url ? "Logo uploaded" : "Add your colors and logo",
    },
    {
      href: "/portal/catalog",
      title: "Product catalog",
      description: `${productCount ?? 0} product${productCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        Welcome{customer.name ? `, ${customer.name}` : ""}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Manage your storefront from here.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="font-medium text-slate-900">{card.title}</p>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
