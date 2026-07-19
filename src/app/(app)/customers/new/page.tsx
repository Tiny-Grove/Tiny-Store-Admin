import Link from "next/link";
import { NewCustomerForm } from "./new-customer-form";

export default function NewCustomerPage() {
  return (
    <div className="max-w-lg space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M12.5 15 7.5 10l5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Customers
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New customer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Creates their profile and emails an activation link so they can set
          a password or sign in with Google.
        </p>
      </div>

      <NewCustomerForm />
    </div>
  );
}
