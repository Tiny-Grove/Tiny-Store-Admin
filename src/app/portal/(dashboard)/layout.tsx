import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { signOutPortal } from "./actions";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/business", label: "Business" },
  { href: "/portal/branding", label: "Branding" },
  { href: "/portal/catalog", label: "Catalog" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getPortalCustomer();
  if (!customer) redirect("/portal/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-600/25">
                T
              </div>
              <span className="text-base font-semibold text-slate-900">
                Tiny Store
              </span>
            </div>
            <nav className="flex gap-5 text-sm text-slate-500">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {customer.email}
            </span>
            <form action={signOutPortal}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
